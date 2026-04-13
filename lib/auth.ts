import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { emailAndPassword } from "better-auth/plugins";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { getBaseUrl } from "@/lib/base-url";
import { eq } from "drizzle-orm";

export const auth = betterAuth({
  baseURL: getBaseUrl(),
  secret: (process.env.AUTH_SECRET || process.env.BETTER_AUTH_SECRET) as string,
  user: {
    additionalFields: {
      tenantId: {
        type: "string",
        required: false,
      },
    },
  },
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.userTable,
      session: schema.sessionTable,
      account: schema.accountTable,
      verification: schema.verificationTable,
    },
  }),
  plugins: [
    nextCookies(),
    emailAndPassword(),
  ],
  callbacks: {
    session: async ({ session, user }) => {
      if (user.tenantId) {
        const tenant = await db.query.tenantTable.findFirst({
          where: eq(schema.tenantTable.id, user.tenantId),
        });
        if (tenant) {
          return {
            ...session,
            user: {
              ...user,
              tenant: {
                owner: tenant.githubOwner,
                repo: tenant.githubRepo,
                branch: tenant.githubBranch,
              },
            },
          };
        }
      }
      return session;
    },
  },
});
