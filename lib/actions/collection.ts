"use server";

import { getServerSession } from "@/lib/session-server";
import { getMasterOctokit } from "@/lib/utils/octokit";
// @ts-ignore
import yaml from "js-yaml";
import { revalidatePath } from "next/cache";

type CreateCollectionParams = {
  collection: {
    type: string;
    name: string;
    label: string;
    path: string;
    fields: Array<{ name: string; label: string; type: string }>;
  };
};

export async function createCollectionAction(params: CreateCollectionParams) {
  const { collection } = params;
  const session = await getServerSession();

  // 1. 세션 및 테넌트 정보 확인 (보안 강화)
  if (!session?.user || !(session.user as any).tenant) {
    throw new Error("로그인이 필요하거나 테넌트 정보가 없습니다.");
  }

  const { owner, repo, branch } = (session.user as any).tenant;
  const octokit = getMasterOctokit();

  // 2. 설정 파일 (.pagescms.yml 또는 pages.yml) 찾기
  let configPath = ".pagescms.yml";
  let sha: string | undefined;
  let currentContent = "";

  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path: configPath,
      ref: branch,
    });

    if ("content" in data) {
      currentContent = Buffer.from(data.content, "base64").toString("utf-8");
      sha = data.sha;
    }
  } catch (error: any) {
    if (error.status === 404) {
      try {
        configPath = "pages.yml";
        const { data } = await octokit.repos.getContent({
          owner,
          repo,
          path: configPath,
          ref: branch,
        });
        if ("content" in data) {
          currentContent = Buffer.from(data.content, "base64").toString("utf-8");
          sha = data.sha;
        }
      } catch (innerError: any) {
        configPath = ".pagescms.yml";
      }
    } else {
      throw error;
    }
  }

  // 3. YAML 파싱 및 설정 병합
  let config: any = { content: [] };
  if (currentContent) {
    try {
      config = yaml.load(currentContent) || { content: [] };
    } catch (e) {
      throw new Error("기존 설정 파일을 파싱하는 데 실패했습니다.");
    }
  }

  if (!config.content) config.content = [];
  
  if (config.content.some((c: any) => c.name === collection.name)) {
    throw new Error(`이미 '${collection.name}'이라는 이름의 게시판이 존재합니다.`);
  }

  config.content.push(collection);

  const updatedYaml = yaml.dump(config, {
    indent: 2,
    lineWidth: -1,
    noRefs: true,
  });

  // 4. GitHub 프록시 커밋 (Master Token 사용)
  const userIdentifier = session.user.name || session.user.email;
  const commitMessage = `CMS: [${userIdentifier}] 님이 새 게시판 [${collection.label}] 설정 추가`;

  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: configPath,
    message: commitMessage,
    content: Buffer.from(updatedYaml).toString("base64"),
    branch,
    sha,
  });

  revalidatePath(`/${owner}/${repo}/${branch}`);

  return { success: true, path: configPath };
}
