import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { BRAND_QUIZ, BRAND_QUIZ_TOTAL } from "@shared/brandQuiz";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Download,
  Heart,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation, useParams } from "wouter";

type PaletteColor = { name: string; hex: string; use: string };

type DirectionData = {
  title: string;
  essence: string;
  visualStyle: string;
  palette: PaletteColor[];
  typography: {
    display: string;
    body: string;
    scale: { h1: string; h2: string; body: string; label: string };
  };
  logoConcept: string;
  imagery: string;
  voice: string;
  site: {
    headline: string;
    description: string;
    sections: Array<{ title: string; purpose: string }>;
  };
};

type DirectionRow = {
  id: number;
  round: number;
  optionKey: string;
  title: string;
  status: string;
  logoImageUrl: string | null;
  content: Record<string, unknown>;
  isFavorite: boolean;
  parentDirectionId: number | null;
  explorationDepth: number;
};

function parseDirection(direction: DirectionRow): DirectionData {
  return direction.content as unknown as DirectionData;
}

function LogoFallback({ title, className = "" }: { title: string; className?: string }) {
  const initials = title
    .split(" ")
    .slice(0, 2)
    .map(word => word[0])
    .join("")
    .toUpperCase();

  return (
    <div className={`grid place-items-center bg-sand font-display text-4xl text-ink ${className}`}>
      {initials}
    </div>
  );
}

export default function BrandWorkspace() {
  const params = useParams<{ brandId: string }>();
  const brandId = Number(params.brandId);
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [showFavorites, setShowFavorites] = useState(false);
  const [isRefinementOpen, setIsRefinementOpen] = useState(false);
  const [refinementNote, setRefinementNote] = useState("");

  const workspace = trpc.brand.getWorkspace.useQuery(
    { brandId },
    { enabled: Number.isFinite(brandId) && brandId > 0 },
  );

  const refresh = () => utils.brand.getWorkspace.invalidate({ brandId });

  const answer = trpc.brand.answer.useMutation({
    onSuccess: refresh,
    onError: error => toast.error(error.message),
  });
  const generate = trpc.brand.generate.useMutation({
    onSuccess: refresh,
    onError: error => toast.error(error.message),
  });
  const regenerate = trpc.brand.regenerate.useMutation({
    onSuccess: refresh,
    onError: error => toast.error(error.message),
  });
  const favorite = trpc.brand.favorite.useMutation({
    onSuccess: refresh,
    onError: error => toast.error(error.message),
  });
  const explore = trpc.brand.explore.useMutation({
    onSuccess: () => {
      setShowFavorites(false);
      refresh();
      toast.success("Criamos cinco novas variações a partir desta direção.");
    },
    onError: error => toast.error(error.message),
  });
  const choose = trpc.brand.choose.useMutation({
    onSuccess: () => {
      refresh();
      toast.success("Identidade escolhida. O brand book está pronto.");
    },
    onError: error => toast.error(error.message),
  });
  const approveSite = trpc.brand.approveSite.useMutation({
    onSuccess: () => {
      refresh();
      toast.success("Sugestão de site aprovada.");
    },
    onError: error => toast.error(error.message),
  });

  if (workspace.isLoading) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-6xl space-y-5 px-5 py-10">
          <Skeleton className="h-10 w-56" />
          <Skeleton className="h-[560px] rounded-[2rem]" />
        </div>
      </DashboardLayout>
    );
  }

  if (workspace.isError || !workspace.data) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-xl px-5 py-20 text-center">
          <p className="font-display text-4xl text-ink">Não foi possível abrir esta marca.</p>
          <Button onClick={() => setLocation("/")} variant="outline" className="mt-6 rounded-full">
            Voltar ao acervo
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const { brand, session, directions, favorites, selectedDirection } = workspace.data;
  const answers = (session?.answers ?? {}) as Record<string, string>;
  const answeredQuestions = BRAND_QUIZ.filter(question => Boolean(answers[question.id])).length;
  const nextQuestionIndex = BRAND_QUIZ.findIndex(question => !answers[question.id]);
  const isComplete = nextQuestionIndex === -1;
  const isBusy =
    generate.isPending ||
    regenerate.isPending ||
    explore.isPending ||
    session?.status === "generating";

  const activeDirections = directions
    .filter(direction => direction.round === session?.currentRound && direction.status === "proposed")
    .sort((a, b) => a.optionKey.localeCompare(b.optionKey)) as DirectionRow[];

  function toggleFavorite(direction: DirectionRow) {
    if (!session) return;
    favorite.mutate({
      sessionId: session.id,
      directionId: direction.id,
      favorite: !direction.isFavorite,
    });
  }

  function exploreDirection(direction: DirectionRow) {
    if (!session) return;
    explore.mutate({ sessionId: session.id, directionId: direction.id });
  }

  function chooseDirection(direction: DirectionRow) {
    if (!session) return;
    choose.mutate({ sessionId: session.id, directionId: direction.id });
  }

  function answerQuestion(option: "A" | "B" | "C" | "D" | "E") {
    const question = BRAND_QUIZ[nextQuestionIndex];
    if (!question || !session) return;
    answer.mutate({ sessionId: session.id, questionId: question.id, option });
  }

  function requestRefinement() {
    if (!session) return;
    const note = refinementNote.trim();
    if (note.length < 8) {
      toast.error("Conte um pouco mais sobre o que você quer mudar.");
      return;
    }
    regenerate.mutate(
      { sessionId: session.id, refinementNote: note },
      {
        onSuccess: () => {
          setIsRefinementOpen(false);
          setRefinementNote("");
        },
      },
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl px-3 py-5 sm:px-5 sm:py-8">
        <button
          onClick={() => setLocation("/")}
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> Acervo de marcas
        </button>

        <header className="mt-7 flex flex-col justify-between gap-5 border-b border-stone-200 pb-6 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow">Diagnóstico de identidade</p>
            <h1 className="mt-2 font-display text-5xl tracking-[-0.045em] text-ink">{brand.name}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {isComplete ? "Diagnóstico concluído" : `${answeredQuestions} de ${BRAND_QUIZ_TOTAL} respostas`}
            </span>
            {!selectedDirection && (
              <Button
                variant="outline"
                onClick={() => setShowFavorites(value => !value)}
                className="rounded-full border-stone-300 bg-white"
              >
                <Heart className={`mr-2 h-4 w-4 ${favorites.length > 0 ? "fill-current" : ""}`} />
                Favoritas
                <Badge className="ml-2">{favorites.length}</Badge>
              </Button>
            )}
            <Badge variant="outline" className="rounded-full border-stone-200 bg-white">
              {session?.status === "selected" ? "Identidade definida" : "Em construção"}
            </Badge>
          </div>
        </header>

        {selectedDirection ? (
          <>
            <BrandBook
              direction={selectedDirection as DirectionRow}
              brandName={brand.name}
              siteApproved={session?.siteApproved ?? false}
              isApprovingSite={approveSite.isPending}
              onApproveSite={() => session && approveSite.mutate({ sessionId: session.id })}
              onExport={() => window.print()}
              onOpenRefinement={() => setIsRefinementOpen(true)}
            />
            {isRefinementOpen && (
              <RefinementPanel
                brandName={brand.name}
                value={refinementNote}
                onChange={setRefinementNote}
                onCancel={() => setIsRefinementOpen(false)}
                onSubmit={requestRefinement}
                loading={regenerate.isPending}
              />
            )}
          </>
        ) : showFavorites ? (
          <FavoritesGallery
            directions={favorites as DirectionRow[]}
            onFavorite={toggleFavorite}
            onExplore={exploreDirection}
            onChoose={chooseDirection}
            busy={favorite.isPending || explore.isPending || choose.isPending}
          />
        ) : !isComplete ? (
          <QuizStep
            questionIndex={nextQuestionIndex}
            answers={answers}
            onChoose={answerQuestion}
            loading={answer.isPending}
          />
        ) : isBusy ? (
          <GeneratingState brandName={brand.name} />
        ) : activeDirections.length === 5 ? (
          <ExplorationGallery
            directions={activeDirections}
            favoritesCount={favorites.length}
            onFavorite={toggleFavorite}
            onExplore={exploreDirection}
            onFinish={() => setShowFavorites(true)}
            busy={favorite.isPending || explore.isPending}
          />
        ) : (
          <ReadyToGenerate
            brandName={brand.name}
            onGenerate={() => session && generate.mutate({ sessionId: session.id })}
            loading={generate.isPending}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

function QuizStep({
  questionIndex,
  answers,
  onChoose,
  loading,
}: {
  questionIndex: number;
  answers: Record<string, string>;
  onChoose: (option: "A" | "B" | "C" | "D" | "E") => void;
  loading: boolean;
}) {
  const question = BRAND_QUIZ[questionIndex];
  const answeredQuestions = BRAND_QUIZ.filter(item => Boolean(answers[item.id])).length;
  const progress = (answeredQuestions / BRAND_QUIZ_TOTAL) * 100;

  return (
    <section className="mx-auto mt-10 max-w-4xl">
      <div className="mb-8 flex items-center justify-between gap-5">
        <div>
          <p className="eyebrow">{question.category}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Pergunta {questionIndex + 1} de {BRAND_QUIZ_TOTAL}
          </p>
        </div>
        <div className="w-32 sm:w-48">
          <Progress value={progress} className="h-1.5 bg-stone-200 [&>div]:bg-olive" />
        </div>
      </div>
      <Card className="overflow-hidden border-stone-200 bg-white">
        <CardContent className="p-7 sm:p-11">
          <h2 className="max-w-3xl font-display text-4xl leading-[1.02] tracking-[-0.04em] text-ink sm:text-5xl">
            {question.prompt}
          </h2>
          <p className="mt-5 max-w-2xl text-sm leading-6 text-muted-foreground">{question.helper}</p>
          <div className="mt-9 grid gap-3 sm:grid-cols-2">
            {question.options.map(option => (
              <button
                key={option.id}
                disabled={loading}
                onClick={() => onChoose(option.id)}
                className="rounded-2xl border border-stone-200 bg-ivory/40 p-5 text-left transition hover:border-olive hover:bg-sand disabled:opacity-60"
              >
                <strong className="text-sm text-ink">
                  {option.id} · {option.label}
                </strong>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">{option.detail}</span>
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
    <section className="mx-auto mt-10 max-w-3xl rounded-[2rem] bg-ink px-8 py-14 text-center text-ivory">
      <Sparkles className="mx-auto text-champagne" />
      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-champagne">Diagnóstico completo</p>
      <h2 className="mt-4 font-display text-5xl">Vamos explorar {brandName}.</h2>
      <p className="mx-auto mt-5 max-w-xl text-sm leading-6 text-ivory/70">
        Começaremos com cinco territórios. Favorite quantos quiser e aprofunde qualquer direção para gerar novas variações.
      </p>
      <Button onClick={onGenerate} disabled={loading} className="mt-8 rounded-full bg-champagne text-ink hover:bg-white">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Gerar 5 direções <ArrowRight className="ml-2 h-4 w-4" /></>}
      </Button>
    </section>
  );
}

function GeneratingState({ brandName }: { brandName: string }) {
  return (
    <section className="mx-auto mt-10 max-w-3xl rounded-[2rem] border border-stone-200 bg-white px-8 py-16 text-center">
      <Loader2 className="mx-auto h-10 w-10 animate-spin text-olive" />
      <h2 className="mt-6 font-display text-5xl text-ink">Explorando o universo de {brandName}.</h2>
      <p className="mt-4 text-sm text-muted-foreground">A IA está criando cinco possibilidades visuais.</p>
    </section>
  );
}

function ExplorationGallery({
  directions,
  favoritesCount,
  onFavorite,
  onExplore,
  onFinish,
  busy,
}: {
  directions: DirectionRow[];
  favoritesCount: number;
  onFavorite: (direction: DirectionRow) => void;
  onExplore: (direction: DirectionRow) => void;
  onFinish: () => void;
  busy: boolean;
}) {
  return (
    <section className="mt-10">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="max-w-2xl">
          <p className="eyebrow">Exploração criativa</p>
          <h2 className="mt-3 font-display text-5xl leading-[0.98] text-ink">Guarde o que gostar. Explore o que despertar algo.</h2>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            O coração salva uma direção. Explorar cria cinco descendentes dela sem apagar suas favoritas.
          </p>
        </div>
        {favoritesCount > 0 && (
          <Button onClick={onFinish} className="rounded-full bg-ink text-ivory hover:bg-olive">
            <Heart className="mr-2 h-4 w-4 fill-current" /> Ver minhas {favoritesCount} favoritas
          </Button>
        )}
      </div>
      <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {directions.map(direction => (
          <DirectionCard
            key={direction.id}
            direction={direction}
            onFavorite={() => onFavorite(direction)}
            onExplore={() => onExplore(direction)}
            busy={busy}
          />
        ))}
      </div>
    </section>
  );
}

function DirectionCard({
  direction,
  onFavorite,
  onExplore,
  busy,
}: {
  direction: DirectionRow;
  onFavorite: () => void;
  onExplore: () => void;
  busy: boolean;
}) {
  const data = parseDirection(direction);
  return (
    <Card className="overflow-hidden border-stone-200 bg-white transition-all hover:-translate-y-1 hover:border-olive">
      <CardContent className="p-0">
        <div
          className="relative grid min-h-56 place-items-center overflow-hidden"
          style={{ background: data.palette?.[0]?.hex ?? "#E9E4D8" }}
        >
          <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-ink">
            {direction.optionKey}
            {direction.explorationDepth > 0 ? ` · nível ${direction.explorationDepth}` : ""}
          </span>
          <button
            aria-label={direction.isFavorite ? "Remover dos favoritos" : "Favoritar"}
            onClick={onFavorite}
            disabled={busy}
            className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white shadow disabled:opacity-60"
          >
            <Heart className={`h-5 w-5 ${direction.isFavorite ? "fill-red-500 text-red-500" : "text-ink"}`} />
          </button>
          {direction.logoImageUrl ? (
            <img
              src={direction.logoImageUrl}
              alt={`Símbolo conceitual ${data.title}`}
              className="h-32 w-32 rounded-2xl object-cover shadow-lg"
            />
          ) : (
            <LogoFallback title={data.title} className="h-32 w-32 rounded-2xl bg-white/85 shadow-lg" />
          )}
        </div>
        <div className="p-6">
          <p className="eyebrow">{data.visualStyle}</p>
          <h3 className="mt-2 font-display text-3xl text-ink">{data.title}</h3>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">{data.essence}</p>
          <div className="mt-5 flex gap-1.5">
            {data.palette?.slice(0, 5).map(color => (
              <span
                key={color.hex}
                title={`${color.name} ${color.hex}`}
                className="h-5 w-5 rounded-full border border-black/5"
                style={{ background: color.hex }}
              />
            ))}
          </div>
          <Button onClick={onExplore} disabled={busy} variant="outline" className="mt-6 w-full rounded-full">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Sparkles className="mr-2 h-4 w-4" /> Explorar esta direção</>}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function FavoritesGallery({
  directions,
  onFavorite,
  onExplore,
  onChoose,
  busy,
}: {
  directions: DirectionRow[];
  onFavorite: (direction: DirectionRow) => void;
  onExplore: (direction: DirectionRow) => void;
  onChoose: (direction: DirectionRow) => void;
  busy: boolean;
}) {
  return (
    <section className="mt-10">
      <p className="eyebrow">Sua curadoria</p>
      <h2 className="mt-3 font-display text-5xl text-ink">Suas favoritas, lado a lado.</h2>
      <p className="mt-4 text-sm text-muted-foreground">
        Continue explorando qualquer favorita ou escolha a identidade vencedora.
      </p>
      {directions.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-stone-300 p-10 text-center text-muted-foreground">
          Você ainda não favoritou nenhuma direção.
        </div>
      ) : (
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {directions.map(direction => (
            <div key={direction.id}>
              <DirectionCard
                direction={direction}
                onFavorite={() => onFavorite(direction)}
                onExplore={() => onExplore(direction)}
                busy={busy}
              />
              <Button
                onClick={() => onChoose(direction)}
                disabled={busy}
                className="mt-2 w-full rounded-full bg-ink text-ivory hover:bg-olive"
              >
                <Check className="mr-2 h-4 w-4" /> Escolher como identidade final
              </Button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function BrandBook({
  direction,
  brandName,
  siteApproved,
  isApprovingSite,
  onApproveSite,
  onExport,
  onOpenRefinement,
}: {
  direction: DirectionRow;
  brandName: string;
  siteApproved: boolean;
  isApprovingSite: boolean;
  onApproveSite: () => void;
  onExport: () => void;
  onOpenRefinement: () => void;
}) {
  const data = parseDirection(direction);
  return (
    <section className="mt-10">
      <div className="mb-5 flex flex-col justify-between gap-4 rounded-2xl border border-stone-200 bg-white p-5 sm:flex-row sm:items-center">
        <div>
          <p className="eyebrow">Identidade aprovada</p>
          <p className="mt-1 text-sm text-muted-foreground">Sua favorita vencedora agora vira o Brand Kit da marca.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onExport} variant="outline" className="rounded-full">
            <Download className="mr-2 h-4 w-4" /> Exportar PDF
          </Button>
          <Button onClick={onOpenRefinement} className="rounded-full bg-ink text-ivory hover:bg-olive">
            <RefreshCw className="mr-2 h-4 w-4" /> Refinar identidade
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-[2rem] bg-ink text-ivory">
        <div className="grid lg:grid-cols-[0.8fr_1.2fr]">
          <div
            className="grid min-h-[340px] place-items-center p-10"
            style={{ background: data.palette?.[0]?.hex ?? "#E9E4D8" }}
          >
            {direction.logoImageUrl ? (
              <img
                src={direction.logoImageUrl}
                alt={`Símbolo conceitual da marca ${brandName}`}
                className="h-48 w-48 rounded-3xl object-cover shadow-xl"
              />
            ) : (
              <LogoFallback title={data.title} className="h-48 w-48 rounded-3xl bg-white/85 shadow-xl" />
            )}
          </div>
          <div className="p-8 sm:p-12">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-champagne">Brand book resumido</p>
            <h2 className="mt-6 font-display text-6xl leading-[0.9]">{brandName}</h2>
            <p className="mt-3 font-display text-3xl text-champagne">{data.title}</p>
            <p className="mt-7 max-w-xl text-base leading-7 text-ivory/70">{data.essence}</p>
            <div className="mt-8 flex flex-wrap gap-2">
              {data.palette?.map(color => (
                <span key={color.hex} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs">
                  {color.name} · {color.hex}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="border-stone-200 bg-white">
          <CardContent className="p-7">
            <p className="eyebrow">Tipografia e voz</p>
            <h3 className="mt-3 font-display text-3xl text-ink">{data.typography?.display}</h3>
            <p className="mt-2 text-sm text-muted-foreground">Texto: {data.typography?.body}</p>
            <p className="mt-6 font-display text-2xl text-ink">{data.voice}</p>
          </CardContent>
        </Card>
        <Card className="border-stone-200 bg-white">
          <CardContent className="p-7">
            <p className="eyebrow">Conceito de logo</p>
            <p className="mt-3 font-display text-3xl leading-8 text-ink">{data.logoConcept}</p>
            <p className="mt-5 text-sm leading-6 text-muted-foreground">{data.imagery}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 border-stone-200 bg-white">
        <CardContent className="p-7 sm:p-9">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="eyebrow">Presença digital</p>
              <h3 className="mt-3 font-display text-4xl text-ink">Sugestão de site</h3>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{data.site?.description}</p>
            </div>
            <Button
              onClick={onApproveSite}
              disabled={siteApproved || isApprovingSite}
              variant={siteApproved ? "outline" : "default"}
              className="rounded-full"
            >
              {isApprovingSite ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : siteApproved ? (
                <><Check className="mr-2 h-4 w-4" /> Site aprovado</>
              ) : (
                <><Check className="mr-2 h-4 w-4" /> Aprovar sugestão</>
              )}
            </Button>
          </div>
          <div className="mt-8 rounded-2xl bg-ink p-7 text-ivory">
            <p className="font-display text-4xl">{data.site?.headline}</p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.site?.sections.map((section, index) => (
                <div key={`${section.title}-${index}`} className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs text-champagne">0{index + 1}</p>
                  <p className="mt-2 font-semibold">{section.title}</p>
                  <p className="mt-1 text-xs leading-5 text-ivory/60">{section.purpose}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function RefinementPanel({
  brandName,
  value,
  onChange,
  onCancel,
  onSubmit,
  loading,
}: {
  brandName: string;
  value: string;
  onChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
  loading: boolean;
}) {
  return (
    <Card className="mt-6 border-olive/25 bg-white">
      <CardContent className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[0.7fr_1.3fr]">
        <div>
          <p className="eyebrow">Refinar identidade</p>
          <h3 className="mt-3 font-display text-4xl text-ink">O que você quer mudar em {brandName}?</h3>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Descreva cores, energia, símbolo, tipografia ou qualquer ponto que queira levar para uma nova rodada.
          </p>
        </div>
        <div>
          <Textarea
            value={value}
            onChange={event => onChange(event.target.value)}
            placeholder="Ex.: Quero algo menos tecnológico, mais humano e com uma paleta mais quente."
            className="min-h-32 resize-y rounded-2xl"
          />
          <div className="mt-4 flex justify-end gap-2">
            <Button onClick={onCancel} disabled={loading} variant="ghost" className="rounded-full">
              Cancelar
            </Button>
            <Button
              onClick={onSubmit}
              disabled={loading || value.trim().length < 8}
              className="rounded-full bg-ink text-ivory hover:bg-olive"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Sparkles className="mr-2 h-4 w-4" /> Gerar nova rodada</>}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
