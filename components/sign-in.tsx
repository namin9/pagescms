"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { signIn } from "@/lib/auth-client";
import { getSafeRedirect } from "@/lib/auth-redirect";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const formSchema = z.object({
  email: z.string().email({
    message: "올바른 이메일 주소를 입력해주세요.",
  }),
  password: z.string().min(1, {
    message: "비밀번호를 입력해주세요.",
  }),
});

export function SignIn() {
  const [isLoading, setIsLoading] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const redirectParam = searchParams.get("redirect") || "";
  const safeRedirect = getSafeRedirect(redirectParam);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      const { error } = await signIn.email({
        email: values.email,
        password: values.password,
        callbackURL: safeRedirect,
      });

      if (error) {
        toast.error("이메일 또는 비밀번호를 확인해주세요.");
        return;
      }

      router.push(safeRedirect);
      router.refresh();
    } catch (err) {
      toast.error("로그인 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen p-4 md:p-6 flex justify-center items-center">
      <div className="sm:max-w-[340px] w-full space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-xl font-semibold tracking-tight">
            Pages CMS 로그인
          </h1>
          <p className="text-sm text-muted-foreground">
            이메일과 비밀번호를 입력하여 접속하세요.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>이메일</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="name@example.com"
                      type="email"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>비밀번호</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="••••••••"
                      type="password"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  로그인 중...
                </>
              ) : (
                "로그인"
              )}
            </Button>
          </form>
        </Form>

        <p className="px-8 text-center text-sm text-muted-foreground">
          로그인 시{" "}
          <a
            className="underline hover:text-primary underline-offset-4"
            href="https://pagescms.org/terms"
            target="_blank"
          >
            서비스 이용약관
          </a>{" "}
          및{" "}
          <a
            className="underline hover:text-primary underline-offset-4"
            href="https://pagescms.org/privacy"
            target="_blank"
          >
            개인정보 처리방침
          </a>
          에 동의하게 됩니다.
        </p>
      </div>
    </div>
  );
}

