import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, ArrowRight, Loader2, Sparkles } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function NewBrand() {
  const [, setLocation] = useLocation();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [differentials, setDifferentials] = useState("");
  const createBrand = trpc.brand.start.useMutation({
    onSuccess: data => setLocation(`/marca/${data.brandId}`),
    onError: error => toast.error(error.message),
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createBrand.mutate({ name, description, differentials });
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-4xl px-1 py-5 sm:px-5 sm:py-8">
        <button onClick={() => setLocation("/")} className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> Voltar ao acervo
        </button>
        <div className="mt-8 grid overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-[0_18px_50px_rgba(35,37,28,0.07)] lg:grid-cols-[0.82fr_1.18fr]">
          <aside className="relative overflow-hidden bg-ink p-8 text-ivory sm:p-10">
            <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full border border-champagne/30" />
            <Sparkles className="h-5 w-5 text-champagne" />
            <p className="mt-10 text-xs font-semibold uppercase tracking-[0.18em] text-champagne">Primeiro gesto</p>
            <h1 className="mt-4 font-display text-5xl leading-[0.94] tracking-[-0.045em]">Conte-nos o que torna esta marca indispensável.</h1>
            <p className="mt-7 text-sm leading-6 text-ivory/70">Com três pontos de partida, criamos um diagnóstico que respeita a verdade da marca antes de pensar na estética.</p>
            <div className="mt-12 space-y-4 border-t border-white/10 pt-7 text-sm text-ivory/70">
              <p><span className="mr-3 font-display text-xl text-champagne">01</span> Contexto e ambição</p>
              <p><span className="mr-3 font-display text-xl text-champagne">02</span> Diagnóstico guiado</p>
              <p><span className="mr-3 font-display text-xl text-champagne">03</span> Direções visuais</p>
            </div>
          </aside>
          <form onSubmit={submit} className="p-7 sm:p-10">
            <p className="eyebrow">Fundação da marca</p>
            <h2 className="mt-3 font-display text-4xl tracking-[-0.035em] text-ink">Comece pelo essencial.</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">Respostas mais específicas criam direções mais autênticas. Você poderá revisar tudo mais tarde.</p>
            <div className="mt-8 space-y-6">
              <div className="space-y-2.5">
                <Label htmlFor="brand-name" className="text-sm font-semibold text-ink">Nome da marca</Label>
                <Input id="brand-name" value={name} onChange={event => setName(event.target.value)} placeholder="Ex.: Noma Studio" className="h-12 rounded-xl border-stone-200 bg-ivory/50 px-4 text-ink placeholder:text-stone-400 focus-visible:ring-olive" required minLength={2} maxLength={160} />
              </div>
              <div className="space-y-2.5">
                <Label htmlFor="brand-description" className="text-sm font-semibold text-ink">Descreva a marca</Label>
                <Textarea id="brand-description" value={description} onChange={event => setDescription(event.target.value)} placeholder="O que a marca oferece, para quem ela existe e que transformação ela promove?" className="min-h-32 resize-none rounded-xl border-stone-200 bg-ivory/50 p-4 leading-6 placeholder:text-stone-400 focus-visible:ring-olive" required minLength={12} maxLength={2000} />
              </div>
              <div className="space-y-2.5">
                <Label htmlFor="brand-differentials" className="text-sm font-semibold text-ink">Diferenciais</Label>
                <Textarea id="brand-differentials" value={differentials} onChange={event => setDifferentials(event.target.value)} placeholder="O que esta marca faz, acredita ou entrega de um jeito que ninguém mais entrega?" className="min-h-28 resize-none rounded-xl border-stone-200 bg-ivory/50 p-4 leading-6 placeholder:text-stone-400 focus-visible:ring-olive" required minLength={8} maxLength={2000} />
              </div>
            </div>
            <div className="mt-9 flex items-center justify-between border-t border-stone-100 pt-6">
              <span className="text-xs text-muted-foreground">Etapa 1 de 3</span>
              <Button disabled={createBrand.isPending} className="h-11 rounded-full bg-ink px-5 text-ivory hover:bg-olive">
                {createBrand.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Iniciar diagnóstico <ArrowRight className="ml-2 h-4 w-4" /></>}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
