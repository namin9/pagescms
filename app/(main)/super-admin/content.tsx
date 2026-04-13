"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createTenantAction, createUserAction } from "@/lib/actions/super-admin";
import { toast } from "sonner";
import { Loader2, Building2, Users } from "lucide-react";

export function SuperAdminContent({ 
  initialTenants, 
  initialUsers 
}: { 
  initialTenants: any[], 
  initialUsers: any[] 
}) {
  const [activeTab, setActiveTab] = useState<"tenants" | "users">("tenants");
  const [isPending, setIsPending] = useState(false);
  const [isTenantModalOpen, setIsTenantModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);

  // 테넌트 등록 핸들러
  async function onTenantSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);
    const formData = new FormData(e.currentTarget);
    
    try {
      await createTenantAction({
        name: formData.get("name") as string,
        githubOwner: formData.get("githubOwner") as string,
        githubRepo: formData.get("githubRepo") as string,
        githubBranch: formData.get("githubBranch") as string,
      });
      toast.success("고객사가 성공적으로 등록되었습니다.");
      setIsTenantModalOpen(false);
    } catch (error: any) {
      toast.error(error.message || "등록 중 오류가 발생했습니다.");
    } finally {
      setIsPending(false);
    }
  }

  // 유저 등록 핸들러
  async function onUserSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);
    const formData = new FormData(e.currentTarget);

    try {
      await createUserAction({
        email: formData.get("email") as string,
        name: formData.get("name") as string,
        password: formData.get("password") as string,
        tenantId: formData.get("tenantId") as string,
      });
      toast.success("관리자 계정이 생성되었습니다.");
      setIsUserModalOpen(false);
    } catch (error: any) {
      toast.error(error.message || "계정 생성 중 오류가 발생했습니다.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* 탭 네비게이션 */}
      <div className="flex space-x-2 bg-muted p-1 rounded-lg w-fit">
        <Button
          variant={activeTab === "tenants" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("tenants")}
          className="px-6"
        >
          <Building2 className="mr-2 h-4 w-4" />
          고객사 관리
        </Button>
        <Button
          variant={activeTab === "users" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("users")}
          className="px-6"
        >
          <Users className="mr-2 h-4 w-4" />
          유저 관리
        </Button>
      </div>

      {activeTab === "tenants" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">고객사(Tenant) 목록</h3>
            <Dialog open={isTenantModalOpen} onOpenChange={setIsTenantModalOpen}>
              <DialogTrigger asChild>
                <Button>+ 새 고객사 등록</Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={onTenantSubmit}>
                  <DialogHeader>
                    <DialogTitle>새 고객사 등록</DialogTitle>
                    <DialogDescription>
                      관리할 새로운 고객사의 이름과 GitHub 정보를 입력하세요.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">고객사 이름</Label>
                      <Input id="name" name="name" placeholder="예: (주)에이전시" required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="githubOwner">GitHub Owner</Label>
                      <Input id="githubOwner" name="githubOwner" placeholder="예: agency-client" required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="githubRepo">GitHub Repo</Label>
                      <Input id="githubRepo" name="githubRepo" placeholder="예: my-site" required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="githubBranch">GitHub Branch</Label>
                      <Input id="githubBranch" name="githubBranch" defaultValue="main" required />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={isPending}>
                      {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      등록하기
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>고객사명</TableHead>
                  <TableHead>GitHub 저장소</TableHead>
                  <TableHead>브랜치</TableHead>
                  <TableHead>등록일</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {initialTenants.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell className="font-medium">{tenant.name}</TableCell>
                    <TableCell>{tenant.githubOwner}/{tenant.githubRepo}</TableCell>
                    <TableCell>{tenant.githubBranch}</TableCell>
                    <TableCell>{new Date(tenant.createdAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
                {initialTenants.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                      등록된 고객사가 없습니다.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {activeTab === "users" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">유저 관리</h3>
            <Dialog open={isUserModalOpen} onOpenChange={setIsUserModalOpen}>
              <DialogTrigger asChild>
                <Button>+ 새 관리자 생성</Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={onUserSubmit}>
                  <DialogHeader>
                    <DialogTitle>새 관리자 계정 생성</DialogTitle>
                    <DialogDescription>
                      특정 고객사에 소속된 관리자 계정을 생성합니다.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="tenantId">소속 고객사 선택</Label>
                      <Select name="tenantId" required>
                        <SelectTrigger>
                          <SelectValue placeholder="고객사를 선택하세요" />
                        </SelectTrigger>
                        <SelectContent>
                          {initialTenants.map(t => (
                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="user-name">이름</Label>
                      <Input id="user-name" name="name" placeholder="홍길동" required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="email">이메일</Label>
                      <Input id="email" name="email" type="email" placeholder="admin@client.com" required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="password">비밀번호</Label>
                      <Input id="password" name="password" type="password" required />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={isPending}>
                      {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      생성하기
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이름</TableHead>
                  <TableHead>이메일</TableHead>
                  <TableHead>소속 고객사</TableHead>
                  <TableHead>가입일</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {initialUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.tenant?.name || "-"}</TableCell>
                    <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
                {initialUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                      등록된 유저가 없습니다.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
