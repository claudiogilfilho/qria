import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { BRAND_QUIZ, BRAND_QUIZ_TOTAL } from "@shared/brandQuiz";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, ArrowRight, Check, ChevronRight, CircleDot, Download, ExternalLink, FileText, LayoutTemplate, Loader2, Palette, Printer, RefreshCw, Sparkles, Type } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { useLocation, useParams } from "wouter";

type PaletteColor = { name: string; hex: string; use: string };
type DirectionData = {
  title: string;
  essence: string;
  visualStyle: string;
  palette: PaletteColor[];
  typography: { display: string; body: string; scale: { h1: string; h2: string; body: string; label: string } };
  logoConcept: string;
  imagery: string;
  voice: string;
  site: { headline: string; description: string; sections: Array<{ title: string; purpose: string }> };
};

type DirectionRow = {
  id: number;
  round: number;
  optionKey: string;
  title: string;
  status: string;
  logoImageUrl: string | null;
  content: Record<string, unknown>;
};

function parseDirection(direction: DirectionRow): DirectionData {
  return direction.content as unknown as DirectionData;
}

function LogoFallback({ title, className = "" }: { title: string; className?: string }) {
  const initials = title.split(" ").slice(0, 2).map(word => word[0]).join("").toUpperCase();
  return <div className={`grid place-items-center bg-sand font-display text-4xl tracking-[-0.12em] text-ink ${className}`}>{initials}</div>;
}

export default function BrandWorkspace() {
  const params = useParams<{ brandId: string }>();
  const brandId = Number(params.brandId);
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [isRefinementOpen, setIsRefinementOpen] = useState(false);
  const [refinementNote, setRefinementNote] = useState("");
  const workspace = trpc.brand.getWorkspace.useQuery({ brandId }, { enabled: Number.isFinite(brandId) && brandId > 0 });
  const answer = trpc.brand.answer.useMutation({
    onSuccess: () => utils.brand.getWorkspace.invalidate({ brandId }),
    onError: error => toast.error(error.message),
  });
  const generate = trpc.brand.generate.useMutation({
    onSuccess: () => utils.brand.getWorkspace.invalidate({ brandId }),
    onError: error => toast.error(error.message),
  });
  const regenerate = trpc.brand.regenerate.useMutation({
    onSuccess: () => utils.brand.getWorkspace.invalidate({ brandId }),
    onError: error => toast.error(error.message),
  });
  const choose = trpc.brand.choose.useMutation({
    onSuccess: () => {
      toast.success("Direção escolhida. O seu brand book está pronto.");
      utils.brand.getWorkspace.invalidate({ brandId });
    },
    onError: error => toast.error(error.message),
  });
  const approveSite = trpc.brand.approveSite.useMutation({
    onSuccess: () => {
      toast.success("Sugestão de site aprovada. Ela fará parte da entrega da marca.");
      utils.brand.getWorkspace.invalidate({ brandId });
    },
    onError: error => toast.error(error.message),
  });

  function requestRefinement() {
    if (!session) return;
    const note = refinementNote.trim();
    if (note.length < 8) {
      toast.error("Conte um pouco mais sobre o que você quer refazer.");
      return;
    }
    regenerate.mutate({ sessionId: session.id, refinementNote: note }, {
      onSuccess: () => {
        setIsRefinementOpen(false);
        setRefinementNote("");
        toast.success("Vamos criar cinco novas direções realmente diferentes a partir da sua observação.");
      },
    });
  }

  if (workspace.isLoading) {
    return <DashboardLayout><div className="mx-auto max-w-6xl space-y-5 px-5 py-10"><Skeleton className="h-10 w-56" /><Skeleton className="h-[560px] rounded-[2rem]" /></div></DashboardLayout>;
  }

  if (workspace.isError || !workspace.data) {
    return <DashboardLayout><div className="mx-auto max-w-xl px-5 py-20 text-center"><p className="font-display text-4xl text-ink">Não foi possível abrir esta marca.</p><Button onClick={() => setLocation("/")} variant="outline" className="mt-6 rounded-full">Voltar ao acervo</Button></div></DashboardLayout>;
  }

  const { brand, session, directions, selectedDirection } = workspace.data;
  const answers = (session?.answers ?? {}) as Record<string, string>;
  const nextQuestionIndex = BRAND_QUIZ.findIndex(question => !answers[question.id]);
  const isComplete = nextQuestionIndex === -1;
  const isBusy = generate.isPending || regenerate.isPending || session?.status === "generating";
  const activeDirections = directions
    .filter(direction => direction.round === session?.currentRound && direction.status === "proposed")
    .sort((a, b) => a.optionKey.localeCompare(b.optionKey)) as DirectionRow[];

  function answerQuestion(option: "A" | "B" | "C" | "D" | "E") {
    const question = BRAND_QUIZ[nextQuestionIndex];
    if (!question || !session) return;
    answer.mutate({ sessionId: session.id, questionId: question.id, option });
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl px-3 py-5 sm:px-5 sm:py-8">
        <button onClick={() => setLocation("/")} className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-ink"><ArrowLeft className="h-4 w-4" /> Acervo de marcas</button>
        <header className="mt-7 flex flex-col justify-between gap-5 border-b border-stone-200 pb-6 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow">Diagnóstico de identidade</p>
            <h1 className="mt-2 font-display text-5xl tracking-[-0.045em] text-ink">{brand.name}</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-muted-foreground sm:block">{isComplete ? "Diagnóstico concluído" : `${Object.keys(answers).length} de ${BRAND_QUIZ_TOTAL} respostas`}</span>
            <Badge variant="outline" className="rounded-full border-stone-200 bg-white px-3 py-1 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{session?.status === "selected" ? "Identidade definida" : "Em construção"}</Badge>
          </div>
        </header>

        {selectedDirection ? (
          <>
            <BrandBook direction={selectedDirection as DirectionRow} brandName={brand.name} siteApproved={session?.siteApproved ?? false} onApproveSite={() => session && approveSite.mutate({ sessionId: session.id })} isApprovingSite={approveSite.isPending} onExport={() => window.print()} onOpenRefinement={() => setIsRefinementOpen(true)} />
            {isRefinementOpen ? <RefinementPanel brandName={brand.name} value={refinementNote} onChange={setRefinementNote} onCancel={() => setIsRefinementOpen(false)} onSubmit={requestRefinement} loading={regenerate.isPending} /> : null}
          </>
        ) : !isComplete ? (
          <QuizStep questionIndex={nextQuestionIndex} answers={answers} onChoose={answerQuestion} loading={answer.isPending} />
        ) : isBusy ? (
          <GeneratingState brandName={brand.name} />
        ) : activeDirections.length === 5 ? (
          <DirectionChooser directions={activeDirections} onChoose={direction => choose.mutate({ sessionId: session!.id, directionId: direction.id })} onReject={() => regenerate.mutate({ sessionId: session!.id })} choosingId={choose.variables?.directionId} isChoosing={choose.isPending} isRegenerating={regenerate.isPending} />
        ) : (
          <ReadyToGenerate brandName={brand.name} onGenerate={() => generate.mutate({ sessionId: session!.id })} loading={generate.isPending} />
        )}
      </div>
    </DashboardLayout>
  );
}

function QuizStep({ questionIndex, answers, onChoose, loading }: { questionIndex: number; answers: Record<string, string>; onChoose: (option: "A" | "B" | "C" | "D" | "E") => void; loading: boolean }) {
  const question = BRAND_QUIZ[questionIndex];
  const progress = (Object.keys(answers).length / BRAND_QUIZ_TOTAL) * 100;
  return (
    <section className="mx-auto mt-10 max-w-4xl">
      <div className="mb-8 flex items-center justify-between gap-5">
        <div><p className="eyebrow">{question.category}</p><p className="mt-2 text-sm text-muted-foreground">Pergunta {questionIndex + 1} de {BRAND_QUIZ_TOTAL}</p></div>
        <div className="w-32 sm:w-48"><Progress value={progress} className="h-1.5 bg-stone-200 [&>div]:bg-olive" /></div>
      </div>
      <Card className="overflow-hidden border-stone-200 bg-white shadow-[0_20px_50px_rgba(35,37,28,0.06)]">
        <CardContent className="p-7 sm:p-11">
          <h2 className="max-w-3xl font-display text-4xl leading-[1.02] tracking-[-0.04em] text-ink sm:text-5xl">{question.prompt}</h2>
          <p className="mt-5 max-w-2xl text-sm leading-6 text-muted-foreground">{question.helper}</p>
          <div className="mt-9 grid gap-3 sm:grid-cols-2">
            {question.options.map(option => (
              <button key={option.id} disabled={loading} onClick={() => onChoose(option.id)} className="group flex min-h-24 items-center gap-4 rounded-2xl border border-stone-200 bg-ivory/40 p-4 text-left transition-all duration-200 hover:border-olive hover:bg-sand focus:outline-none focus-visible:ring-2 focus-visible:ring-olive disabled:cursor-wait disabled:opacity-60">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-stone-300 bg-white text-xs font-semibold text-ink transition-colors group-hover:border-olive group-hover:bg-olive group-hover:text-white">{option.id}</span>
                <span><span className="block text-sm font-semibold text-ink">{option.label}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{option.detail}</span></span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function ReadyToGenerate({ brandName, onGenerate, loading }: { brandName: string; onGenerate: () => void; loading: boolean }) {
  return (
    <section className="mx-auto mt-10 max-w-3xl overflow-hidden rounded-[2rem] bg-ink px-7 py-12 text-center text-ivory shadow-[0_24px_60px_rgba(35,37,28,0.18)] sm:px-12">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-champagne text-ink"><Sparkles className="h-6 w-6" /></div>
      <p className="mt-7 text-xs font-semibold uppercase tracking-[0.18em] text-champagne">Diagnóstico completo</p>
      <h2 className="mt-4 font-display text-5xl leading-none tracking-[-0.045em]">Agora, vamos dar forma a {brandName}.</h2>
      <p className="mx-auto mt-5 max-w-xl text-sm leading-6 text-ivory/70">Vamos criar cinco territórios de identidade, cada um com conceito de logo, paleta, tipografia e uma ideia de presença digital.</p>
      <Button disabled={loading} onClick={onGenerate} className="mt-8 h-12 rounded-full bg-champagne px-6 font-semibold text-ink hover:bg-[#d7cd8e]">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Gerar cinco direções <ArrowRight className="ml-2 h-4 w-4" /></>}</Button>
    </section>
  );
}

function GeneratingState({ brandName }: { brandName: string }) {
  return (
    <section className="mx-auto mt-10 max-w-3xl overflow-hidden rounded-[2rem] border border-stone-200 bg-white px-7 py-16 text-center shadow-[0_20px_50px_rgba(35,37,28,0.05)]">
      <div className="relative mx-auto h-20 w-20"><div className="absolute inset-0 rounded-full border border-champagne animate-[spin_4s_linear_infinite]" /><div className="absolute inset-3 grid place-items-center rounded-full bg-ink text-champagne"><Sparkles className="h-5 w-5" /></div></div>
      <p className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-olive">Direção em formação</p>
      <h2 className="mt-4 font-display text-5xl tracking-[-0.045em] text-ink">Estamos desenhando o território de {brandName}.</h2>
      <p className="mx-auto mt-5 max-w-md text-sm leading-6 text-muted-foreground">A inteligência artificial está combinando estratégia, sistema visual e presença digital. Pode levar alguns segundos.</p>
    </section>
  );
}

function DirectionChooser({ directions, onChoose, onReject, choosingId, isChoosing, isRegenerating }: { directions: DirectionRow[]; onChoose: (direction: DirectionRow) => void; onReject: () => void; choosingId?: number; isChoosing: boolean; isRegenerating: boolean }) {
  return (
    <section className="mt-10">
      <div className="max-w-2xl"><p className="eyebrow">Rodada de exploração</p><h2 className="mt-3 font-display text-5xl leading-[0.98] tracking-[-0.045em] text-ink">Qual direção traduz melhor a sua ambição?</h2><p className="mt-4 text-sm leading-6 text-muted-foreground">Cada alternativa é um território completo. Escolha A, B, C, D ou E. Se nenhuma fizer sentido, gere uma nova rodada com cinco rotas deliberadamente diferentes das anteriores.</p></div>
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {directions.map(direction => <DirectionCard key={direction.id} direction={direction} onChoose={() => onChoose(direction)} isChoosing={isChoosing && choosingId === direction.id} />)}
      </div>
      <div className="mt-7 flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-stone-300 bg-white/45 px-5 py-5 text-center sm:flex-row sm:text-left">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-stone-200 text-xs font-semibold text-ink"><RefreshCw className="h-4 w-4" /></span>
        <p className="text-sm text-muted-foreground"><strong className="font-semibold text-ink">Nenhuma destas direções.</strong> Vamos preservar o diagnóstico e buscar rotas realmente diferentes.</p>
        <Button disabled={isRegenerating || isChoosing} onClick={onReject} variant="outline" className="shrink-0 rounded-full border-stone-300 bg-white text-ink hover:bg-sand">{isRegenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <><RefreshCw className="mr-2 h-4 w-4" /> Não gostei de nenhuma — gerar outras 5</>}</Button>
      </div>
    </section>
  );
}

function DirectionCard({ direction, onChoose, isChoosing }: { direction: DirectionRow; onChoose: () => void; isChoosing: boolean }) {
  const data = parseDirection(direction);
  return (
    <Card className="overflow-hidden border-stone-200 bg-white shadow-none transition-all duration-200 hover:-translate-y-1 hover:border-olive hover:shadow-[0_18px_45px_rgba(35,37,28,0.10)]">
      <CardContent className="p-0">
        <div className="relative grid min-h-56 place-items-center overflow-hidden" style={{ background: data.palette?.[0]?.hex ?? "#E9E4D8" }}>
          <div className="absolute left-5 top-5 grid h-8 w-8 place-items-center rounded-full bg-white/85 text-xs font-semibold text-ink">{direction.optionKey}</div>
          {direction.logoImageUrl ? <img src={direction.logoImageUrl} alt={`Símbolo conceitual ${data.title}`} className="h-32 w-32 rounded-2xl object-cover shadow-[0_14px_30px_rgba(0,0,0,0.15)]" /> : <LogoFallback title={data.title} className="h-28 w-28 rounded-2xl bg-white/80 shadow-[0_14px_30px_rgba(0,0,0,0.10)]" />}
        </div>
        <div className="p-6">
          <div className="flex items-start justify-between gap-4"><div><p className="eyebrow">{data.visualStyle}</p><h3 className="mt-2 font-display text-3xl tracking-[-0.035em] text-ink">{data.title}</h3></div><CircleDot className="mt-1 h-5 w-5 text-olive" /></div>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">{data.essence}</p>
          <div className="mt-5 flex gap-1.5">{data.palette?.slice(0, 5).map(color => <span key={color.hex} title={color.hex} className="h-5 w-5 rounded-full border border-black/5" style={{ background: color.hex }} />)}</div>
          <div className="mt-5 flex items-center justify-between border-t border-stone-100 pt-4"><span className="text-xs text-muted-foreground">{data.typography?.display}</span><Button disabled={isChoosing} onClick={onChoose} variant="ghost" className="h-8 rounded-full px-2 text-sm font-semibold text-ink hover:bg-sand">{isChoosing ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Escolher <ChevronRight className="ml-1 h-4 w-4" /></>}</Button></div>
        </div>
      </CardContent>
    </Card>
  );
}

function BrandBook({ direction, brandName, siteApproved, isApprovingSite, onApproveSite, onExport, onOpenRefinement }: { direction: DirectionRow; brandName: string; siteApproved: boolean; isApprovingSite: boolean; onApproveSite: () => void; onExport: () => void; onOpenRefinement: () => void }) {
  const data = parseDirection(direction);
  return (
    <section className="print-brandbook mt-10">
      <div className="no-print mb-5 flex flex-col justify-between gap-4 rounded-2xl border border-stone-200 bg-white/80 px-5 py-4 sm:flex-row sm:items-center">
        <div><p className="eyebrow">Identidade aprovada</p><p className="mt-1 text-sm text-muted-foreground">Baixe o resumo, imprima em PDF ou peça um novo refinamento.</p></div>
        <div className="flex flex-wrap gap-2"><Button onClick={onExport} variant="outline" className="rounded-full border-stone-300 bg-white text-ink hover:bg-sand"><Download className="mr-2 h-4 w-4" /> Exportar PDF</Button><Button onClick={onExport} variant="outline" className="rounded-full border-stone-300 bg-white text-ink hover:bg-sand"><Printer className="mr-2 h-4 w-4" /> Imprimir</Button><Button onClick={onOpenRefinement} className="rounded-full bg-ink text-ivory hover:bg-olive"><RefreshCw className="mr-2 h-4 w-4" /> Refazer marca</Button></div>
      </div>
      <div className="overflow-hidden rounded-[2rem] bg-ink text-ivory shadow-[0_24px_70px_rgba(35,37,28,0.16)]">
        <div className="grid lg:grid-cols-[0.8fr_1.2fr]">
          <div className="relative grid min-h-[360px] place-items-center overflow-hidden p-10" style={{ background: data.palette?.[0]?.hex ?? "#E9E4D8" }}>
            <div className="absolute inset-7 rounded-full border border-black/10" />
            {direction.logoImageUrl ? <img src={direction.logoImageUrl} alt={`Símbolo conceitual da marca ${brandName}`} className="relative h-48 w-48 rounded-3xl object-cover shadow-[0_22px_42px_rgba(0,0,0,0.20)]" /> : <LogoFallback title={data.title} className="relative h-48 w-48 rounded-3xl bg-white/85 shadow-[0_22px_42px_rgba(0,0,0,0.15)]" />}
          </div>
          <div className="p-8 sm:p-12"><div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-champagne">Brand book resumido</p><Badge className="bg-white/10 text-[10px] uppercase tracking-[0.12em] text-ivory hover:bg-white/10">Direção {direction.optionKey}</Badge></div><h2 className="mt-6 font-display text-6xl leading-[0.9] tracking-[-0.055em]">{brandName}</h2><p className="mt-3 font-display text-3xl text-champagne">{data.title}</p><p className="mt-7 max-w-xl text-base leading-7 text-ivory/70">{data.essence}</p><div className="mt-9 flex flex-wrap gap-2">{data.palette?.map(color => <span key={color.hex} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-ivory/80">{color.hex}</span>)}</div></div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card className="border-stone-200 bg-white shadow-none"><CardContent className="p-7 sm:p-8"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-sand text-olive"><Palette className="h-4 w-4" /></span><div><p className="eyebrow">Paleta</p><h3 className="mt-1 font-display text-3xl text-ink">Cores com função</h3></div></div><div className="mt-7 space-y-3">{data.palette?.map(color => <div className="flex items-center gap-3" key={color.hex}><span className="h-10 w-10 rounded-xl border border-black/5" style={{ background: color.hex }} /><div><p className="text-sm font-semibold text-ink">{color.name} <span className="ml-1 font-mono text-xs font-normal text-muted-foreground">{color.hex}</span></p><p className="text-xs text-muted-foreground">{color.use}</p></div></div>)}</div></CardContent></Card>
        <Card className="border-stone-200 bg-white shadow-none"><CardContent className="p-7 sm:p-8"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-sand text-olive"><Type className="h-4 w-4" /></span><div><p className="eyebrow">Tipografia</p><h3 className="mt-1 font-display text-3xl text-ink">Voz escrita</h3></div></div><div className="mt-7 border-b border-stone-100 pb-5"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Destaque · {data.typography?.scale.h1}</p><p className="mt-2 text-4xl tracking-[-0.045em] text-ink" style={{ fontFamily: data.typography?.display }}>{data.typography?.display}</p></div><div className="py-5"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Texto · {data.typography?.scale.body}</p><p className="mt-2 text-base text-ink" style={{ fontFamily: data.typography?.body }}>{data.typography?.body}</p></div><p className="text-xs leading-5 text-muted-foreground">Escala recomendada: H1 {data.typography?.scale.h1} · H2 {data.typography?.scale.h2} · Texto {data.typography?.scale.body} · Rótulos {data.typography?.scale.label}</p></CardContent></Card>
      </div>

      <Card className="mt-6 overflow-hidden border-stone-200 bg-white shadow-none"><CardContent className="grid gap-8 p-7 sm:p-9 lg:grid-cols-[0.85fr_1.15fr]"><div><p className="eyebrow">Diretrizes visuais</p><h3 className="mt-3 font-display text-4xl leading-none tracking-[-0.04em] text-ink">O sistema em uma frase.</h3><p className="mt-5 text-sm leading-6 text-muted-foreground">{data.visualStyle}. {data.imagery}</p><div className="mt-6 rounded-2xl bg-sand p-5"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-olive">Voz da marca</p><p className="mt-2 font-display text-2xl leading-7 text-ink">{data.voice}</p></div></div><div className="rounded-2xl border border-stone-200 bg-ivory/35 p-6"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Conceito de logotipo</p><p className="mt-3 font-display text-3xl leading-8 text-ink">{data.logoConcept}</p><div className="mt-7 flex items-center gap-2 text-xs text-muted-foreground"><Check className="h-4 w-4 text-olive" /> Use o símbolo com áreas de respiro generosas e aplicações de alta legibilidade.</div></div></CardContent></Card>

      <BrandApplications data={data} brandName={brandName} logoImageUrl={direction.logoImageUrl} />
      <SiteSuggestion data={data} brandName={brandName} siteApproved={siteApproved} isApprovingSite={isApprovingSite} onApprove={onApproveSite} />
    </section>
  );
}

function RefinementPanel({ brandName, value, onChange, onCancel, onSubmit, loading }: { brandName: string; value: string; onChange: (value: string) => void; onCancel: () => void; onSubmit: () => void; loading: boolean }) {
  return <Card className="no-print mt-6 overflow-hidden border-olive/25 bg-white shadow-[0_18px_45px_rgba(35,37,28,0.08)]"><CardContent className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[0.7fr_1.3fr]"><div><p className="eyebrow">Refazer marca</p><h3 className="mt-3 font-display text-4xl leading-none tracking-[-0.04em] text-ink">O que precisa mudar?</h3><p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">Descreva sua percepção: cores, energia, símbolo, tipografia, público ou qualquer ponto que queira ver diferente em {brandName}.</p></div><div><Textarea value={value} onChange={event => onChange(event.target.value)} placeholder="Ex.: Quero algo menos tecnológico, mais humano e com uma paleta quente. O símbolo deve parecer mais orgânico." className="min-h-32 resize-y rounded-2xl border-stone-300 bg-ivory/45 px-4 py-3 text-sm leading-6 text-ink placeholder:text-muted-foreground/75" /><div className="mt-4 flex flex-wrap justify-end gap-2"><Button onClick={onCancel} disabled={loading} variant="ghost" className="rounded-full text-ink hover:bg-sand">Cancelar</Button><Button onClick={onSubmit} disabled={loading || value.trim().length < 8} className="rounded-full bg-ink text-ivory hover:bg-olive">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Sparkles className="mr-2 h-4 w-4" /> Gerar novas direções</>}</Button></div></div></CardContent></Card>;
}

function BrandApplications({ data, brandName, logoImageUrl }: { data: DirectionData; brandName: string; logoImageUrl: string | null }) {
  const primary = data.palette?.[0]?.hex ?? "#24251C";
  const surface = data.palette?.[1]?.hex ?? "#F6F3ED";
  const accent = data.palette?.[2]?.hex ?? "#C4B96D";
  const contrast = data.palette?.[3]?.hex ?? "#FFFFFF";
  return <section className="print-page-break mt-6 overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-none"><div className="border-b border-stone-200 px-7 py-7 sm:px-9"><p className="eyebrow">Aplicações da marca</p><h3 className="mt-3 font-display text-4xl tracking-[-0.04em] text-ink">A identidade em movimento.</h3><p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Simulações iniciais para avaliar como a marca se comporta em materiais essenciais antes da produção final.</p></div><div className="grid gap-6 p-5 sm:grid-cols-2 sm:p-8 lg:grid-cols-3"><div className="application-card overflow-hidden rounded-2xl border border-stone-200 bg-ivory p-4"><p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Cartão de visita</p><div className="aspect-[1.6] rounded-xl p-5 shadow-[0_14px_28px_rgba(0,0,0,0.14)]" style={{ background: primary, color: contrast }}><div className="flex items-start justify-between"><span className="font-display text-2xl leading-none" style={{ fontFamily: data.typography?.display }}>{brandName}</span>{logoImageUrl ? <img src={logoImageUrl} alt="Símbolo aplicado no cartão" className="h-9 w-9 rounded-lg object-cover" /> : <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/15 text-xs">{brandName.slice(0, 1)}</span>}</div><div className="mt-10 text-[9px] leading-4 opacity-75" style={{ fontFamily: data.typography?.body }}>contato@{brandName.toLowerCase().replace(/\s+/g, "")}.com<br />Estratégia que ganha forma.</div></div></div><div className="application-card overflow-hidden rounded-2xl border border-stone-200 bg-ivory p-4"><p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Papel timbrado</p><div className="min-h-52 rounded-xl border border-black/5 p-5 shadow-[0_14px_28px_rgba(0,0,0,0.08)]" style={{ background: surface }}><div className="flex items-center justify-between border-b pb-4" style={{ borderColor: `${primary}22` }}><span className="font-display text-2xl text-ink" style={{ fontFamily: data.typography?.display }}>{brandName}</span><span className="h-2 w-12 rounded-full" style={{ background: accent }} /></div><p className="brand-body-copy mt-6 text-xs leading-5 text-stone-600" style={{ fontFamily: data.typography?.body }}>Uma comunicação consistente começa por uma presença clara, reconhecível e fiel ao que a marca acredita.</p></div></div><div className="application-card overflow-hidden rounded-2xl border border-stone-200 bg-ivory p-4 sm:col-span-2 lg:col-span-1"><p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Peça de apresentação</p><div className="min-h-52 rounded-xl p-5 shadow-[0_14px_28px_rgba(0,0,0,0.14)]" style={{ background: accent, color: primary }}><p className="text-[10px] font-semibold uppercase tracking-[0.16em] opacity-70">{data.title}</p><p className="mt-5 font-display text-3xl leading-[0.94] tracking-[-0.04em]" style={{ fontFamily: data.typography?.display }}>{data.site?.headline}</p><span className="mt-6 inline-flex rounded-full px-3 py-1.5 text-[10px] font-semibold" style={{ background: primary, color: contrast }}>Conhecer a marca</span></div></div></div></section>;
}

function SiteSuggestion({ data, brandName, siteApproved, isApprovingSite, onApprove }: { data: DirectionData; brandName: string; siteApproved: boolean; isApprovingSite: boolean; onApprove: () => void }) {
  return (
    <section className="mt-6 overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-none">
      <div className="flex flex-col justify-between gap-4 border-b border-stone-200 px-7 py-7 sm:flex-row sm:items-end sm:px-9"><div><p className="eyebrow">Presença digital</p><h3 className="mt-3 font-display text-4xl tracking-[-0.04em] text-ink">Sugestão de site</h3><p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Uma arquitetura inicial para apresentar a marca com a mesma coerência que sustenta a identidade.</p></div><Button onClick={onApprove} disabled={siteApproved || isApprovingSite} variant={siteApproved ? "outline" : "default"} className={siteApproved ? "rounded-full border-olive/30 bg-olive/10 text-olive" : "rounded-full bg-ink text-ivory hover:bg-olive"}>{isApprovingSite ? <Loader2 className="h-4 w-4 animate-spin" /> : siteApproved ? <><Check className="mr-2 h-4 w-4" /> Site aprovado</> : <><LayoutTemplate className="mr-2 h-4 w-4" /> Aprovar site</>}</Button></div>
      <div className="grid lg:grid-cols-[0.85fr_1.15fr]">
        <div className="p-7 sm:p-9"><div className="flex items-center justify-between text-xs text-muted-foreground"><span>Estrutura recomendada</span><ExternalLink className="h-4 w-4" /></div><div className="mt-6 space-y-4">{data.site?.sections.map((section, index) => <div className="flex gap-4" key={`${section.title}-${index}`}><span className="pt-0.5 font-display text-2xl text-champagne">0{index + 1}</span><div><p className="font-semibold text-ink">{section.title}</p><p className="mt-1 text-sm leading-5 text-muted-foreground">{section.purpose}</p></div></div>)}</div></div>
        <div className="p-4 sm:p-7" style={{ background: data.palette?.[0]?.hex ?? "#E9E4D8" }}><div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_18px_40px_rgba(0,0,0,0.12)]"><div className="flex items-center justify-between border-b border-stone-100 px-5 py-4"><span className="text-xl text-ink" style={{ fontFamily: data.typography?.display }}>{brandName}</span><span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground" style={{ fontFamily: data.typography?.body }}>Menu</span></div><div className="site-preview-copy px-7 py-10 sm:px-10" style={{ background: data.palette?.[1]?.hex ?? "#F6F3ED" }}><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-olive" style={{ fontFamily: data.typography?.body }}>{data.title}</p><h4 className="mt-4 max-w-md text-4xl leading-[0.95] tracking-[-0.045em] text-ink" style={{ fontFamily: data.typography?.display }}>{data.site?.headline}</h4><p className="brand-body-copy mt-5 max-w-sm text-sm leading-6 text-stone-600" style={{ fontFamily: data.typography?.body }}>{data.site?.description}</p><span className="mt-7 inline-flex rounded-full px-4 py-2 text-xs font-semibold" style={{ background: data.palette?.[2]?.hex ?? "#24251C", color: data.palette?.[3]?.hex ?? "#FFFFFF", fontFamily: data.typography?.body }}>Conhecer a marca</span></div></div></div>
      </div>
    </section>
  );
}
