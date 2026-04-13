"use server";

import { getSession } from "@/lib/session-server";
import { Octokit } from "@octokit/rest";
import yaml from "js-yaml";
import { revalidatePath } from "next/cache";

type CreateCollectionParams = {
  owner: string;
  repo: string;
  branch: string;
  collection: {
    type: string;
    name: string;
    label: string;
    path: string;
    fields: Array<{ name: string; label: string; type: string }>;
  };
};

export async function createCollectionAction(params: CreateCollectionParams) {
  const { owner, repo, branch, collection } = params;
  const session = await getSession();

  if (!session?.githubAccessToken) {
    throw new Error("GitHub 인증이 필요합니다.");
  }

  const octokit = new Octokit({ auth: session.githubAccessToken });

  // 1. 설정 파일 (.pagescms.yml 또는 pages.yml) 찾기
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
    // .pagescms.yml이 없으면 pages.yml 시도
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
        // 둘 다 없으면 새로 생성 (.pagescms.yml)
        configPath = ".pagescms.yml";
      }
    } else {
      throw error;
    }
  }

  // 2. YAML 파싱 및 설정 병합
  let config: any = { content: [] };
  if (currentContent) {
    try {
      config = yaml.load(currentContent) || { content: [] };
    } catch (e) {
      throw new Error("기존 설정 파일을 파싱하는 데 실패했습니다.");
    }
  }

  if (!config.content) config.content = [];
  
  // 중복된 이름 확인
  if (config.content.some((c: any) => c.name === collection.name)) {
    throw new Error(`이미 '${collection.name}'이라는 이름의 게시판이 존재합니다.`);
  }

  config.content.push(collection);

  // 3. YAML 문자열로 변환 (깔끔한 인덴테이션 적용)
  const updatedYaml = yaml.dump(config, {
    indent: 2,
    lineWidth: -1,
    noRefs: true,
  });

  // 4. GitHub에 커밋
  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: configPath,
    message: `CMS: 새 게시판 [${collection.label}] 설정 추가`,
    content: Buffer.from(updatedYaml).toString("base64"),
    branch,
    sha,
  });

  // 5. 캐시 갱신 (선택 사항)
  revalidatePath(`/${owner}/${repo}/${branch}`);

  return { success: true, path: configPath };
}
