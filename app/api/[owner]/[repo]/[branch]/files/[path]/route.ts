import { type NextRequest } from "next/server";
import { getMasterOctokit } from "@/lib/utils/octokit";
import { isContentOperationAllowed } from "@/lib/operations";
import { writeFns } from "@/fields/registry";
import { configVersion, parseConfig, normalizeConfig } from "@/lib/config";
import { stringify, parse } from "@/lib/serialization";
import { deepMap, generateZodSchema, getSchemaByName, sanitizeObject } from "@/lib/schema";
import { getConfig, updateConfig } from "@/lib/config-store";
import { getFileExtension, getFileName, normalizePath, serializedTypes, getParentPath } from "@/lib/utils/file";
import { assertGithubIdentity } from "@/lib/authz-shared";
import { updateFileCache } from "@/lib/github-cache-file";
import { createHttpError, toErrorResponse } from "@/lib/api-error";
import mergeWith from "lodash.mergewith";
import { buildCommitTokens, resolveCommitIdentity, resolveCommitMessage } from "@/lib/commit-message";
import { requireApiUserSession } from "@/lib/session-server";

export async function POST(
  request: Request,
  context: { params: Promise<{ owner: string, repo: string, branch: string, path: string }> }
) {
  try {
    const params = await context.params;
    const sessionResult = await requireApiUserSession();
    if ("response" in sessionResult) return sessionResult.response;
    const user = sessionResult.user as any;
    const tenant = user.tenant;

    if (!tenant || tenant.owner !== params.owner || tenant.repo !== params.repo) {
      throw createHttpError("이 저장소에 대한 접근 권한이 없습니다.", 403);
    }

    const masterToken = process.env.GITHUB_MASTER_TOKEN;
    if (!masterToken) throw new Error("Server configuration error: GITHUB_MASTER_TOKEN not set.");

    const normalizedPath = normalizePath(params.path);

    const config = await getConfig(params.owner, params.repo, params.branch, {
      getToken: async () => masterToken,
    });
    if (!config && normalizedPath !== ".pages.yml") throw new Error(`Configuration not found for ${params.owner}/${params.repo}/${params.branch}.`);

    const data: any = await request.json();
    const onConflict = data.onConflict === "error" ? "error" : "rename";

    let contentBase64;
    let schema;
    let schemaCommitTemplates: Record<string, string> | undefined;
    let schemaCommitIdentity: "app" | "user" | undefined;

    switch (data.type) {
      case "content":
        if (!data.name) throw new Error(`"name" is required for content.`);

        schema = getSchemaByName(config?.object, data.name);
        if (!schema) throw new Error(`Content schema not found for ${data.name}.`);
        if (!data.sha && !isContentOperationAllowed("create", { schema })) {
          throw createHttpError(`Creating entries isn't allowed for "${data.name}".`, 403);
        }
        schemaCommitTemplates = schema?.commit?.templates;
        schemaCommitIdentity = schema?.commit?.identity;

        if (!normalizedPath.startsWith(schema.path)) throw new Error(`Invalid path "${params.path}" for ${data.type} "${data.name}".`);

        if (schema.subfolders === false && getParentPath(normalizedPath) !== schema.path) {
          throw new Error(`Subfolders are not allowed for collection "${data.name}".`);
        }

        if (getFileName(normalizedPath) === ".gitkeep") {
          contentBase64 = "";
        } else {
          if (getFileExtension(normalizedPath) !== (schema.extension ?? "")) throw new Error(`Invalid extension "${getFileExtension(normalizedPath)}" for ${data.type} "${data.name}".`);

          if (serializedTypes.includes(schema.format) && schema.fields) {
            let contentFields;
            let contentObject;

            if (schema.list) {
              contentObject = { listWrapper: data.content };
              contentFields = [{
                name: "listWrapper",
                type: "object",
                list: true,
                fields: schema.fields
              }]
            } else {
              contentObject = data.content;
              contentFields = schema.fields;
            }
            
            const zodSchema = generateZodSchema(contentFields);
            const zodValidation = zodSchema.safeParse(contentObject);
            
            if (zodValidation.success === false ) {
              const errorMessages = zodValidation.error.errors.map((error: any) => {
                let message = error.message;
                if (error.path.length > 0) message = `${message} at ${error.path.join(".")}`;
                return message;
              });
              throw new Error(`Content validation failed: ${errorMessages.join(", ")}`);
            }

            const validatedContentObject = deepMap(
              zodValidation.data,
              contentFields,
              (value, field) => {
                const fieldType = field.type as string;
                return writeFns[fieldType] ? writeFns[fieldType](value, field, config || {}) : value;
              }
            );

            const unwrappedContentObject = schema.list
              ? validatedContentObject.listWrapper
              : validatedContentObject;

            let finalContentObject = JSON.parse(JSON.stringify(unwrappedContentObject));

            if (config?.object?.settings?.content?.merge && data.sha && !schema.list) {
              const octokit = getMasterOctokit();
              const response = await octokit.rest.repos.getContent({
                owner: params.owner,
                repo: params.repo,
                path: normalizedPath,
                ref: params.branch
              });
              
              if (Array.isArray(response.data)) {
                throw new Error("Expected a file but found a directory");
              } else if (response.data.type !== "file") {
                throw new Error("Invalid response type");
              }

              const existingContent = Buffer.from(response.data.content, "base64").toString();
              const existingContentObject = parse(existingContent, { format: schema.format, delimiters: schema.delimiters });

              finalContentObject = mergeWith({}, existingContentObject, unwrappedContentObject, (objValue: any, srcValue: any) => {
                if (Array.isArray(srcValue)) {
                  return srcValue;
                }
              });
            }
            
            const stringifiedContentObject = stringify(
              sanitizeObject(finalContentObject),
              {
                format: schema.format,
                delimiters: schema.delimiters
              }
            );
            contentBase64 = Buffer.from(stringifiedContentObject).toString("base64");
          } else {
            contentBase64 = Buffer.from(data.content.body ?? "").toString("base64");
          }
        }
        break;
      case "media":
        if (!data.name) throw new Error(`"name" is required for media.`);

        schema = getSchemaByName(config?.object, data.name, "media");
        if (!schema) throw new Error(`Media schema not found for ${data.name}.`);
        schemaCommitTemplates = schema?.commit?.templates;
        schemaCommitIdentity = schema?.commit?.identity;

        if (!normalizedPath.startsWith(schema.input)) throw new Error(`Invalid path "${params.path}" for media "${data.name}".`);
        
        if (getFileName(normalizedPath) === ".gitkeep") {
          contentBase64 = "";
        } else {
          if (
            schema.extensions?.length > 0 &&
            !schema.extensions.includes(getFileExtension(normalizedPath))
          ) throw new Error(`Invalid extension "${getFileExtension(normalizedPath)}" for media.`);

          contentBase64 = data.content;
        }
        break;
      case "settings":
        if (normalizedPath !== ".pages.yml") throw new Error(`Invalid path "${params.path}" for settings.`);
        if (!data.sha && !isContentOperationAllowed("create", { scope: "settings" })) {
          throw createHttpError(`Creating the settings file isn't allowed.`, 403);
        }

        contentBase64 = Buffer.from(data.content.body ?? "").toString("base64");
        break;
      default:
        throw new Error(`Invalid type "${data.type}".`);
    }

    const committer = {
      name: user.name?.trim() || user.email,
      email: user.email,
    };
    
    const response = await githubSaveFile(
      params.owner,
      params.repo,
      params.branch,
      normalizedPath,
      contentBase64,
      data.sha,
      {
        configObject: config?.object,
        templatesOverride: schemaCommitTemplates,
        contentName: data.name,
        user: user.email || user.name || String(user.id || ""),
        onConflict,
        committer,
      }
    );
  
    const savedPath = response?.data.content?.path;

    let newConfig;
    if (data.type === "settings") {
      const parsedConfig = parseConfig(data.content.body ?? "");
      const configObject = normalizeConfig(parsedConfig.document.toJSON());
      newConfig = {
        owner: params.owner,
        repo: params.repo,
        branch: params.branch,
        sha: response?.data.content?.sha as string,
        version: configVersion ?? "0.0",
        object: configObject
      };
      
      await updateConfig(newConfig);
    }
    
    if (response?.data.content && response?.data.commit) {
      await updateFileCache(
        data.type === 'content' ? 'collection' : 'media',
        params.owner,
        params.repo,
        params.branch,
        {
          type: data.sha ? 'modify' : 'add',
          path: response.data.content.path!,
          sha: response.data.content.sha!,
          content: Buffer.from(contentBase64, 'base64').toString('utf-8'),
          size: response.data.content.size,
          downloadUrl: response.data.content.download_url,
          commit: {
            sha: response.data.commit.sha!,
            timestamp: new Date(response.data.commit.committer?.date ?? new Date().toISOString()).getTime()
          }
        }
      );
    }

    return Response.json({
      status: "success",
      message: savedPath !== normalizedPath
        ? `File "${normalizedPath}" saved successfully but renamed to "${savedPath}" to avoid naming conflict.`
        : `File "${normalizedPath}" saved successfully.`,
      data: {
        type: response?.data.content?.type,
        sha: response?.data.content?.sha,
        name: response?.data.content?.name,
        path: savedPath,
        extension: getFileExtension(response?.data.content?.name || ""),
        size: response?.data.content?.size,
        url: response?.data.content?.download_url,
        config: newConfig ?? undefined,
      }
    });
  } catch (error: any) {
    console.error(error);
    return toErrorResponse(error);
  }
};

const githubSaveFile = async (
  owner: string,
  repo: string,
  branch: string,
  path: string,
  contentBase64: string,
  sha?: string,
  options?: {
    configObject?: Record<string, any>;
    templatesOverride?: Record<string, string>;
    contentName?: string;
    user?: string;
    onConflict?: "rename" | "error";
    committer?: { name: string; email: string };
  },
) => {
  const octokit = getMasterOctokit();
  
  const originalMessage = resolveCommitMessage({
    configObject: options?.configObject,
    templatesOverride: options?.templatesOverride,
    action: sha ? "update" : "create",
    tokens: buildCommitTokens({
      action: sha ? "update" : "create",
      owner,
      repo,
      branch,
      path,
      contentName: options?.contentName,
      user: options?.user,
      userName: options?.committer?.name,
      userEmail: options?.committer?.email,
    }),
  });

  const message = `CMS: [${options?.user}] ${originalMessage}`;

  try {
    const response = await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message,
      content: contentBase64,
      branch,
      sha: sha || undefined,
      committer: options?.committer,
    });

    if (response.data.content && response.data.commit) {
      return response;
    }
    throw new Error("Invalid response structure");
  } catch (error: any) {
    const githubMessage = typeof error?.response?.data?.message === "string"
      ? error.response.data.message
      : undefined;

    if (error.status === 409) {
      if (githubMessage?.includes("Repository rule violations found")) {
        throw createHttpError(
          "This repository requires changes through a pull request.",
          409,
        );
      }

      if (sha) {
        throw createHttpError(
          "File has changed since you last loaded it. Please refresh the page and try again.",
          409,
        );
      }
    }

    if (error.status === 422 && !sha) {
      if (options?.onConflict === "error") {
        throw createHttpError(`File \"${path}\" already exists.`, 409);
      }

      const parentDir = getParentPath(path);
      const { data } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: parentDir || '.',
        ref: branch,
      });

      if (!Array.isArray(data)) {
        throw new Error('Expected directory listing');
      }

      const basename = path.split('/').pop() || "";
      const lastDotIndex = basename.lastIndexOf(".");
      const filename = lastDotIndex > 0 ? basename.slice(0, lastDotIndex) : basename;
      const extension = lastDotIndex > 0 ? basename.slice(lastDotIndex + 1) : "";
      
      const maxNumber = Math.max(0, ...data.map(file => {
        const match = file.name.match(new RegExp(`^${filename}-(\\d+)${extension ? "\\." + extension : ""}$`));
        return match ? parseInt(match[1], 10) : 0;
      }));

      for (let i = 1; i <= 3; i++) {
        const candidateFilename = extension
          ? `${filename}-${maxNumber + i}.${extension}`
          : `${filename}-${maxNumber + i}`;
        const newPath = `${parentDir ? parentDir + '/' : ''}${candidateFilename}`;
        const fallbackMessage = `CMS: [${options?.user}] ${candidateFilename} 생성`;

        try {
          const response = await octokit.rest.repos.createOrUpdateFileContents({
            owner,
            repo,
            path: newPath,
            message: fallbackMessage,
            content: contentBase64,
            branch,
            committer: options?.committer,
          });

          if (response.data.content && response.data.commit) {
            return response;
          }
        } catch (error: any) {
          if (i === 3 || error.status !== 422) throw error;
        }
      }
    }
    throw error;
  }
};

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ owner: string, repo: string, branch: string, path: string }> }
) {
  try {
    const params = await context.params;
    const sessionResult = await requireApiUserSession();
    if ("response" in sessionResult) return sessionResult.response;
    const user = sessionResult.user as any;
    const tenant = user.tenant;

    if (!tenant || tenant.owner !== params.owner || tenant.repo !== params.repo) {
      throw createHttpError("이 저장소에 대한 접근 권한이 없습니다.", 403);
    }

    const masterToken = process.env.GITHUB_MASTER_TOKEN;
    if (!masterToken) throw new Error("Server configuration error: GITHUB_MASTER_TOKEN not set.");

    const searchParams = request.nextUrl.searchParams;
    const sha = searchParams.get("sha");
    const type = searchParams.get("type");
    const name = searchParams.get("name");

    if (!type || !["content", "media"].includes(type)) throw new Error(`"type" is required.`);
    if (!sha) throw new Error(`"sha" is required.`);

    const config = await getConfig(params.owner, params.repo, params.branch, {
      getToken: async () => masterToken,
    });
    if (!config) throw new Error(`Configuration not found.`);

    const normalizedPath = normalizePath(params.path);
    let schema;
    let schemaCommitTemplates: Record<string, string> | undefined;
    let schemaCommitIdentity: "app" | "user" | undefined;

    switch (type) {
      case "content":
        if (!name) throw new Error(`"name" is required.`);
        schema = getSchemaByName(config.object, name);
        if (!schema) throw new Error(`Content schema not found.`);
        schemaCommitTemplates = schema?.commit?.templates;
        schemaCommitIdentity = schema?.commit?.identity;
        break;
      case "media":
        if (!name) throw new Error(`"name" is required.`);
        schema = getSchemaByName(config.object, name, "media");
        if (!schema) throw new Error(`Media schema not found.`);
        schemaCommitTemplates = schema?.commit?.templates;
        schemaCommitIdentity = schema?.commit?.identity;
        break;
    }

    const committer = {
      name: user.name?.trim() || user.email,
      email: user.email,
    };
    
    const octokit = getMasterOctokit();
    const originalMessage = resolveCommitMessage({
      configObject: config.object,
      templatesOverride: schemaCommitTemplates,
      action: "delete",
      tokens: buildCommitTokens({
        action: "delete",
        owner: params.owner,
        repo: params.repo,
        branch: params.branch,
        path: normalizedPath,
        contentName: name || undefined,
        user: user.email || user.name || String(user.id || ""),
        userName: committer?.name,
        userEmail: committer?.email,
      }),
    });

    const response = await octokit.rest.repos.deleteFile({
      owner: params.owner,
      repo: params.repo,
      branch: params.branch,
      path: normalizedPath,
      sha: sha,
      message: `CMS: [${user.email}] ${originalMessage}`,
      committer,
    });

    await updateFileCache(
      type === "content" ? "collection" : "media",
      params.owner,
      params.repo,
      params.branch,
      {
        type: 'delete',
        path: normalizedPath,
        commit: response?.data.commit?.sha
          ? {
              sha: response.data.commit.sha,
              timestamp: new Date(response.data.commit.committer?.date ?? new Date().toISOString()).getTime(),
            }
          : undefined,
      }
    );

    return Response.json({ status: "success", data: { sha: response?.data.commit.sha, path: normalizedPath } });
  } catch (error: any) {
    console.error(error);
    return toErrorResponse(error);
  }
};
