const DEV_BASE_URL = "http://localhost:3000";

export const getBaseUrl = () => {
  const baseUrl = process.env.BASE_URL?.trim();

  if (baseUrl) {
    return baseUrl;
  }

  if (process.env.NODE_ENV !== "production") {
    return DEV_BASE_URL;
  }

  return process.env.CF_PAGES_URL || "https://cms-5f9.pages.dev";
};
