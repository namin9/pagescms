"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useRepo } from "@/contexts/repo-context";
import { useConfig } from "@/contexts/config-context";
import { createCollectionAction } from "@/lib/actions/collection";
import { Loader2 } from "lucide-react";

// 게시판 설정을 위한 유효성 검사 스키마
const collectionFormSchema = z.object({
  name: z
    .string()
    .min(2, { message: "영문 고유 이름은 2자 이상이어야 합니다." })
    .regex(/^[a-z0-9_-]+$/, {
      message: "영문 소문자, 숫자, 하이픈(-), 언더바(_)만 사용할 수 있습니다.",
    }),
  label: z.string().min(1, { message: "메뉴에 표시될 이름을 입력해 주세요." }),
  path: z.string().min(1, { message: "데이터 저장 경로를 입력해 주세요." }),
  fields: z.array(z.string()).min(1, {
    message: "최소 하나 이상의 필드를 선택해 주세요.",
  }),
});

type CollectionFormValues = z.infer<typeof collectionFormSchema>;

// 기본 필드 정의
const FIELD_OPTIONS = [
  { id: "title", label: "제목", type: "string" },
  { id: "date", label: "작성일", type: "date" },
  { id: "image", label: "대표 이미지", type: "image" },
  { id: "body", label: "본문 내용", type: "rich-text" },
];

export function CreateCollectionDialog() {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { owner, repo } = useRepo();
  const { config } = useConfig();
  const branch = config?.branch || "main";

  const form = useForm<CollectionFormValues>({
    resolver: zodResolver(collectionFormSchema),
    defaultValues: {
      name: "",
      label: "",
      path: "",
      fields: ["title", "body"], // 기본으로 제목과 본문 선택
    },
  });

  const onSubmit = async (values: CollectionFormValues) => {
    setIsSubmitting(true);
    
    try {
      // YAML 구조에 맞는 객체 생성
      const selectedFields = FIELD_OPTIONS.filter((opt) =>
        values.fields.includes(opt.id),
      ).map((opt) => ({
        name: opt.id,
        label: opt.label,
        type: opt.type,
      }));

      const collectionYamlObject = {
        type: "collection",
        name: values.name,
        label: values.label,
        path: values.path,
        fields: selectedFields,
      };

      const result = await createCollectionAction({
        collection: collectionYamlObject,
      });

      if (result.success) {
        toast.success(`새 게시판 [${values.label}]이 성공적으로 생성되었습니다!`);
        setOpen(false);
        form.reset();
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "게시판을 생성하는 도중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isSubmitting) setOpen(isOpen);
    }}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon-xs"
          className="h-6 w-6 text-muted-foreground hover:text-foreground"
          title="새 게시판 추가"
          disabled={isSubmitting}
        >
          <Plus className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>새 게시판(Collection) 만들기</DialogTitle>
          <DialogDescription>
            코딩 없이 새로운 콘텐츠 게시판을 정의할 수 있습니다. 
            생성된 설정은 리포지토리의 설정 파일에 직접 커밋됩니다.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>게시판 고유 이름 (영문)</FormLabel>
                    <FormControl>
                      <Input placeholder="예: gallery, notice" {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormDescription>
                      시스템 내부에서 사용되는 영문 고유 ID입니다.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>메뉴에 표시될 이름</FormLabel>
                    <FormControl>
                      <Input placeholder="예: 마을 갤러리, 공지사항" {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormDescription>
                      왼쪽 사이드바 메뉴에 나타날 친절한 한글 이름입니다.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="path"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>데이터 저장 경로</FormLabel>
                    <FormControl>
                      <Input placeholder="예: content/gallery" {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormDescription>
                      게시판 글들이 저장될 리포지토리 내의 폴더 경로입니다.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fields"
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel className="text-base">포함할 필드 선택</FormLabel>
                      <FormDescription>
                        이 게시판의 각 글에 포함될 데이터 필드들을 선택해 주세요.
                      </FormDescription>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {FIELD_OPTIONS.map((item) => (
                        <FormField
                          key={item.id}
                          control={form.control}
                          name="fields"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={item.id}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    disabled={isSubmitting}
                                    checked={field.value?.includes(item.id)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, item.id])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) => value !== item.id
                                            )
                                          );
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal cursor-pointer">
                                  {item.label}
                                </FormLabel>
                              </FormItem>
                            );
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
              >
                취소
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    생성 중...
                  </>
                ) : (
                  "게시판 생성하기"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
