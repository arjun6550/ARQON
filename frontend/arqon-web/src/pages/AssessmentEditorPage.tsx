import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useMemo } from "react";
import { FormProvider, useFieldArray, useForm, useFormContext } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  FileText,
  Calendar,
  Code2,
  ShieldCheck,
  Scale,
  Eye,
  Layers,
  ArrowLeft,
  Sparkles,
  Plus,
  Trash2,
  Save,
  Send,
  Copy,
  CheckCircle2,
  Search,
  Check
} from "lucide-react";
import { useConfirm } from "../components/Confirm";
import { ErrorPanel } from "../components/ErrorPanel";
import { Skeleton } from "../components/Skeleton";
import { useToast } from "../components/Toaster";
import { apiFetch, jsonInit } from "../lib/apiClient";
import {
  assessmentDetailSchema, detailToForm, emptyAssessmentForm, formToRequest, typesPresent, validateAssessmentForm,
  type AssessmentDetail, type AssessmentFormValues,
} from "../lib/assessments";
import { LANGUAGES, languageLabels, questionDetailSchema, questionSummarySchema } from "../lib/questions";
import { pageOf } from "../lib/schemas";

type BoolField = {
  [K in keyof AssessmentFormValues]: AssessmentFormValues[K] extends boolean ? K : never;
}[keyof AssessmentFormValues];
type NumField = "durationMinutes" | "maxWarnings" | "weightMcq" | "weightCoding" | "passPercentage" | "graceSeconds" | "maxRecoveries";

function CheckField({ name, label }: { name: BoolField; label: string }) {
  const { register } = useFormContext<AssessmentFormValues>();
  return (
    <label className="flex items-center gap-2.5 text-xs font-medium text-ink cursor-pointer select-none panel p-2.5 rounded-xl border border-line hover:border-ink transition-colors">
      <input
        type="checkbox"
        className="h-4 w-4 rounded accent-ink cursor-pointer"
        {...register(name)}
      />
      <span>{label}</span>
    </label>
  );
}

function NumFieldInput({ name, label, disabled }: { name: NumField; label: string; disabled?: boolean }) {
  const { register } = useFormContext<AssessmentFormValues>();
  return (
    <label className="text-xs font-semibold text-muted block">
      <span>{label}</span>
      <input
        type="number"
        disabled={disabled}
        className="mt-1 w-full rounded-xl border border-line bg-panel px-3 py-2 text-xs font-normal text-ink focus:border-ink shadow-2xs disabled:opacity-50"
        {...register(name, { valueAsNumber: true })}
      />
    </label>
  );
}

function Card({
  title,
  icon: Icon,
  badge,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="panel rounded-2xl border border-line bg-panel p-5 sm:p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-line pb-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-sky-500" />
          <h2 className="text-sm font-bold text-ink">{title}</h2>
        </div>
        {badge && <span className="badge text-[10px] font-mono bg-sunk text-muted">{badge}</span>}
      </div>
      {children}
    </section>
  );
}

function SectionCard({ index, onRemove }: { index: number; onRemove: () => void }) {
  const { control, register, watch } = useFormContext<AssessmentFormValues>();
  const items = useFieldArray({ control, name: `sections.${index}.items` });
  const type = watch(`sections.${index}.type`);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const picker = useQuery({
    queryKey: ["picker", type, search],
    enabled: open,
    queryFn: () =>
      apiFetch(
        `/api/v1/questions?type=${type}&size=10${search ? `&search=${encodeURIComponent(search)}` : ""}`,
        pageOf(questionSummarySchema)
      ),
  });
  const pinned = new Set(items.fields.map((f) => f.questionId));

  return (
    <div className="space-y-4 rounded-xl border border-line p-4 bg-sunk/10">
      <div className="flex flex-wrap items-center gap-3">
        <input
          aria-label="Section title"
          placeholder="Section Title (e.g. Core Algorithms)"
          className="flex-1 min-w-[200px] rounded-xl border border-line bg-panel px-3 py-2 text-xs font-semibold text-ink shadow-2xs focus:border-ink"
          {...register(`sections.${index}.title`)}
        />
        <select
          aria-label="Section type"
          disabled={items.fields.length > 0}
          className="rounded-xl border border-line bg-panel px-3 py-2 text-xs font-semibold text-ink shadow-2xs disabled:opacity-60"
          {...register(`sections.${index}.type`)}
        >
          <option value="MCQ">Multiple Choice (MCQ)</option>
          <option value="CODING">Coding Exercise</option>
        </select>
        <button
          type="button"
          className="btn btn-quiet btn-sm text-xs font-semibold text-rose-500 hover:border-rose-400 cursor-pointer flex items-center gap-1"
          onClick={onRemove}
        >
          <Trash2 className="h-3 w-3" />
          <span>Remove Section</span>
        </button>
      </div>

      <ul className="divide-y divide-line rounded-xl border border-line bg-panel text-xs shadow-2xs">
        {items.fields.length === 0 && (
          <li className="px-4 py-3 text-muted italic">
            No questions added to this section yet. Click "+ Add Questions" below to select from your bank.
          </li>
        )}
        {items.fields.map((f, i) => (
          <li key={f.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
            <div className="flex items-center gap-2 flex-1">
              <span className="badge text-[10px] font-bold bg-sunk text-ink">Q{i + 1}</span>
              <span className="font-semibold text-ink">{f.title}</span>
              <span className="text-[10px] text-muted font-mono">v{f.version}</span>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-[11px] font-semibold text-muted flex items-center gap-1.5">
                <span>Points:</span>
                <input
                  type="number"
                  aria-label={`Points for ${f.title}`}
                  className="w-16 rounded-lg border border-line bg-panel px-2 py-1 text-center font-bold text-ink"
                  {...register(`sections.${index}.items.${i}.points`, { valueAsNumber: true })}
                />
              </label>
              <button
                type="button"
                className="text-muted hover:text-rose-500 transition-colors cursor-pointer text-xs"
                onClick={() => items.remove(i)}
                title="Remove question"
              >
                ✕
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="btn btn-quiet btn-sm text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          onClick={() => setOpen(!open)}
        >
          <Plus className="h-3 w-3" />
          <span>{open ? "Close Question Picker" : "Select Questions from Bank"}</span>
        </button>
      </div>

      {open && (
        <div className="space-y-3 rounded-xl border border-line bg-panel p-4 shadow-xs">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted pointer-events-none" />
            <input
              aria-label="Search questions"
              placeholder={`Search available ${type === "MCQ" ? "multiple choice" : "coding"} questions…`}
              className="w-full rounded-xl border border-line bg-panel pl-9 pr-3 py-2 text-xs shadow-2xs focus:border-ink"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {picker.isError && <ErrorPanel error={picker.error} />}
          {picker.data?.items.length === 0 && (
            <p className="text-xs text-muted italic">No matching questions found in question bank.</p>
          )}
          <ul className="divide-y divide-line rounded-lg border border-line bg-sunk/20 text-xs">
            {picker.data?.items.map((q) => {
              const isAdded = pinned.has(q.id);
              return (
                <li key={q.id} className="flex items-center justify-between p-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-ink">{q.title}</span>
                    <span className="badge text-[10px] font-mono">{q.difficulty}</span>
                    <span className="text-[10px] text-muted">v{q.currentVersion}</span>
                  </div>
                  <button
                    type="button"
                    className={`btn btn-sm text-xs font-semibold cursor-pointer ${
                      isAdded ? "btn-quiet opacity-50" : "btn-primary"
                    }`}
                    disabled={isAdded}
                    onClick={() =>
                      items.append({
                        questionId: q.id,
                        version: q.currentVersion,
                        points: 1,
                        title: q.title,
                      })
                    }
                  >
                    {isAdded ? (
                      <>
                        <Check className="h-3 w-3 inline mr-1" />
                        Added
                      </>
                    ) : (
                      "+ Add to Section"
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

async function loadTitles(d: AssessmentDetail): Promise<Record<string, string>> {
  const titles: Record<string, string> = {};
  await Promise.all(
    d.sections
      .flatMap((s) => s.items)
      .map(async (i) => {
        try {
          const q = await apiFetch(`/api/v1/questions/${i.questionId}/versions/${i.version}`, questionDetailSchema);
          titles[i.questionId] = q.title;
        } catch {
          /* fall back to the id */
        }
      })
  );
  return titles;
}

export function AssessmentEditorPage() {
  const { id } = useParams();
  const editing = id !== undefined;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const toast = useToast();
  const [clientErrors, setClientErrors] = useState<string[]>([]);

  const methods = useForm<AssessmentFormValues>({ defaultValues: emptyAssessmentForm() });
  const { register, handleSubmit, reset, watch, control, getValues, formState } = methods;
  const sections = useFieldArray({ control, name: "sections" });
  const scheduleType = watch("scheduleType");
  const sectionValues = watch("sections");
  const duration = watch("durationMinutes");
  const weightMcq = watch("weightMcq");
  const weightCoding = watch("weightCoding");

  const detail = useQuery({
    queryKey: ["assessment", id],
    enabled: editing,
    queryFn: () => apiFetch(`/api/v1/assessments/${id}`, assessmentDetailSchema),
  });

  useEffect(() => {
    const d = detail.data;
    if (!d) return;
    let cancelled = false;
    void loadTitles(d).then((titles) => {
      if (!cancelled) reset(detailToForm(d, titles));
    });
    return () => {
      cancelled = true;
    };
  }, [detail.data, reset]);

  const afterSave = async (d: AssessmentDetail) => {
    await qc.invalidateQueries({ queryKey: ["assessments"] });
    if (editing) qc.setQueryData(["assessment", id], d);
    else navigate(`/assessments/${d.id}`, { replace: true });
  };
  const save = useMutation({
    mutationFn: (v: AssessmentFormValues) =>
      editing
        ? apiFetch(`/api/v1/assessments/${id}`, assessmentDetailSchema, jsonInit("PUT", formToRequest(v, detail.data?.revision)))
        : apiFetch("/api/v1/assessments", assessmentDetailSchema, jsonInit("POST", formToRequest(v))),
    onSuccess: (d) => {
      toast.show("Draft changes successfully saved");
      return afterSave(d);
    },
  });
  const publish = useMutation({
    mutationFn: () =>
      apiFetch(
        `/api/v1/assessments/${id}/publish?expectedRevision=${detail.data?.revision ?? 0}`,
        assessmentDetailSchema,
        jsonInit("POST")
      ),
    onSuccess: (d) => {
      toast.show("Assessment published! Candidates may now be invited.");
      return afterSave(d);
    },
  });
  const copy = useMutation({
    mutationFn: () => apiFetch(`/api/v1/assessments/${id}/copy`, assessmentDetailSchema, jsonInit("POST")),
    onSuccess: (d) => {
      void qc.invalidateQueries({ queryKey: ["assessments"] });
      navigate(`/assessments/${d.id}`);
    },
  });

  const onSave = handleSubmit((values) => {
    const errors = validateAssessmentForm(values, false);
    setClientErrors(errors);
    if (errors.length === 0) save.mutate(values);
  });
  const onPublish = async () => {
    if (formState.isDirty) {
      setClientErrors(["Save your changes before publishing."]);
      return;
    }
    const errors = validateAssessmentForm(getValues(), true);
    setClientErrors(errors);
    if (
      errors.length === 0 &&
      (await confirm({
        title: "Publish this assessment?",
        message: "It is frozen once published and cannot be modified. You can duplicate it to create a new revision later.",
        confirmLabel: "Publish Assessment",
      }))
    )
      publish.mutate();
  };

  const blueprint = useMemo(() => {
    const totalSections = sectionValues?.length ?? 0;
    const totalQuestions = (sectionValues ?? []).reduce((acc, s) => acc + (s.items?.length ?? 0), 0);
    const totalPoints = (sectionValues ?? []).reduce(
      (acc, s) => acc + (s.items ?? []).reduce((sum, item) => sum + (Number(item.points) || 0), 0),
      0
    );
    const presentTypes = typesPresent({ ...getValues(), sections: sectionValues });
    const isWeightValid =
      presentTypes.length === 0 ||
      (presentTypes.length === 1 && presentTypes.includes("MCQ") && weightMcq === 100) ||
      (presentTypes.length === 1 && presentTypes.includes("CODING") && weightCoding === 100) ||
      (presentTypes.includes("MCQ") && presentTypes.includes("CODING") && (weightMcq + weightCoding === 100));

    return { totalSections, totalQuestions, totalPoints, presentTypes, isWeightValid };
  }, [sectionValues, weightMcq, weightCoding, getValues]);

  if (editing && detail.isPending)
    return (
      <div className="space-y-4" role="status" aria-label="Loading">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-40" />
        <Skeleton className="h-64" />
      </div>
    );
  if (editing && detail.isError) return <ErrorPanel error={detail.error} />;
  const status = detail.data?.status ?? "DRAFT";
  const readOnly = status !== "DRAFT";

  return (
    <FormProvider {...methods}>
      <div className="space-y-6">
        {/* Navigation & Header */}
        <div className="border-b border-line pb-6">
          <Link
            to="/assessments"
            className="link-action text-xs flex items-center gap-1.5 font-semibold text-muted hover:text-ink no-underline mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Assessments</span>
          </Link>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="page-title text-2xl md:text-3xl font-extrabold text-ink">
                  {editing ? "Assessment Authoring Studio" : "Create New Assessment"}
                </h1>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    status === "PUBLISHED"
                      ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                      : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                  }`}
                >
                  {status}
                </span>
              </div>
              <p className="text-xs md:text-sm text-muted mt-1">
                Configure timing constraints, proctoring security policies, scoring rubrics, and questions.
              </p>
            </div>

            {/* Top Action Bar */}
            {!readOnly && (
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  disabled={save.isPending}
                  onClick={onSave}
                  className="btn btn-quiet btn-sm text-xs font-semibold flex items-center gap-1.5 cursor-pointer hover:border-ink"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>{save.isPending ? "Saving…" : "Save Draft"}</span>
                </button>
                {editing && (
                  <button
                    type="button"
                    disabled={publish.isPending}
                    onClick={onPublish}
                    className="btn btn-primary btn-sm text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>{publish.isPending ? "Publishing…" : "Publish Assessment"}</span>
                  </button>
                )}
              </div>
            )}
            {readOnly && (
              <button
                type="button"
                className="btn btn-quiet btn-sm text-xs font-semibold flex items-center gap-1.5 cursor-pointer hover:border-ink"
                disabled={copy.isPending}
                onClick={() => copy.mutate()}
              >
                <Copy className="h-3.5 w-3.5" />
                <span>Duplicate into New Draft</span>
              </button>
            )}
          </div>
        </div>

        {readOnly && (
          <div className="panel p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between">
            <span>
              This assessment is <b>{status.toLowerCase()}</b> and cannot be modified to protect candidate scoring integrity.
            </span>
            <button
              type="button"
              className="font-bold underline hover:no-underline cursor-pointer ml-3"
              disabled={copy.isPending}
              onClick={() => copy.mutate()}
            >
              Duplicate as Draft
            </button>
          </div>
        )}

        <form onSubmit={onSave} className="grid gap-6 lg:grid-cols-3" noValidate>
          {/* Main 2-Column Form Body */}
          <div className="space-y-6 lg:col-span-2">
            <fieldset disabled={readOnly} className="space-y-6">
              {/* Card 1: Details */}
              <Card title="Assessment Details" icon={FileText} badge="Meta">
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-muted">
                    <span>Title</span>
                    <input
                      placeholder="e.g. Senior Backend Engineer Benchmark (Q4 2026)"
                      className="mt-1 w-full rounded-xl border border-line bg-panel px-3 py-2 text-xs font-normal text-ink focus:border-ink shadow-2xs"
                      {...register("title")}
                    />
                  </label>
                  <label className="block text-xs font-semibold text-muted">
                    <span>Description & Instructions</span>
                    <textarea
                      rows={3}
                      placeholder="Guidance shown to candidates prior to launching the exam timer…"
                      className="mt-1 w-full rounded-xl border border-line bg-panel px-3 py-2 text-xs font-normal text-ink focus:border-ink shadow-2xs"
                      {...register("description")}
                    />
                  </label>
                </div>
              </Card>

              {/* Card 2: Schedule & Timer */}
              <Card title="Schedule & Authoritative Timer" icon={Calendar} badge="Server Time Authority">
                <div className="grid gap-3 sm:grid-cols-4">
                  <label className="text-xs font-semibold text-muted">
                    <span>Window Type</span>
                    <select
                      className="mt-1 w-full rounded-xl border border-line bg-panel px-3 py-2 text-xs font-normal text-ink focus:border-ink shadow-2xs"
                      {...register("scheduleType")}
                    >
                      <option value="FLEXIBLE_WINDOW">Flexible start window</option>
                      <option value="FIXED_WINDOW">Fixed window</option>
                    </select>
                  </label>
                  <label className="text-xs font-semibold text-muted">
                    <span>{scheduleType === "FIXED_WINDOW" ? "Starts" : "Can start from"}</span>
                    <input
                      type="datetime-local"
                      className="mt-1 w-full rounded-xl border border-line bg-panel px-3 py-2 text-xs font-normal text-ink focus:border-ink shadow-2xs"
                      {...register("windowStart")}
                    />
                  </label>
                  <label className="text-xs font-semibold text-muted">
                    <span>{scheduleType === "FIXED_WINDOW" ? "Ends" : "Can start until"}</span>
                    <input
                      type="datetime-local"
                      className="mt-1 w-full rounded-xl border border-line bg-panel px-3 py-2 text-xs font-normal text-ink focus:border-ink shadow-2xs"
                      {...register("windowEnd")}
                    />
                  </label>
                  <NumFieldInput
                    name="durationMinutes"
                    label="Duration (min, max 180)"
                    disabled={scheduleType === "FIXED_WINDOW"}
                  />
                </div>
                <p className="text-[11px] text-muted">
                  {scheduleType === "FIXED_WINDOW"
                    ? "Fixed Window: All candidates begin simultaneously; duration equals the time window."
                    : "Flexible Window: Candidates may initiate their attempt any time inside the window, receiving the full duration."}
                </p>
              </Card>

              {/* Card 3: Allowed Languages */}
              <Card title="Permitted Programming Languages" icon={Code2} badge="Execution Sandboxes">
                <div className="flex flex-wrap gap-2 text-xs">
                  {LANGUAGES.map((l) => (
                    <label
                      key={l}
                      className="flex items-center gap-2 panel px-3 py-1.5 rounded-xl border border-line cursor-pointer hover:border-ink transition-colors font-mono"
                    >
                      <input
                        type="checkbox"
                        value={l}
                        className="h-3.5 w-3.5 rounded accent-ink cursor-pointer"
                        {...register("languages")}
                      />
                      <span>{languageLabels[l]}</span>
                    </label>
                  ))}
                </div>
              </Card>

              {/* Card 4: Integrity & Proctoring */}
              <Card title="Proctoring & Integrity Safeguards" icon={ShieldCheck} badge="Anti-Cheat">
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <CheckField name="fullscreenRequired" label="Enforce Browser Fullscreen Lockout" />
                  <CheckField name="blockCopyPaste" label="Disable Clipboard Copy / Paste" />
                  <CheckField name="cameraRequired" label="Require WebRTC Optical Camera Stream" />
                  <CheckField name="microphoneRequired" label="Require Ambient Audio Microphone Feed" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2 pt-2">
                  <label className="text-xs font-semibold text-muted">
                    <span>On Tab Departure / Window Blur</span>
                    <select
                      className="mt-1 w-full rounded-xl border border-line bg-panel px-3 py-2 text-xs font-normal text-ink focus:border-ink shadow-2xs"
                      {...register("tabSwitchAction")}
                    >
                      <option value="RECORD">Record in telemetry log only</option>
                      <option value="WARN">Alert candidate with modal</option>
                      <option value="FLAG_FOR_REVIEW">Flag attempt for human audit</option>
                    </select>
                  </label>
                  <NumFieldInput name="maxWarnings" label="Warning Strikes Before Flagging" />
                </div>
              </Card>

              {/* Card 5: Scoring Rubric */}
              <Card title="Scoring & Weighting Rubric" icon={Scale} badge="Sum = 100%">
                <div className="grid gap-3 sm:grid-cols-3">
                  {typesPresent({ ...getValues(), sections: sectionValues }).includes("MCQ") && (
                    <NumFieldInput name="weightMcq" label="MCQ Weight %" />
                  )}
                  {typesPresent({ ...getValues(), sections: sectionValues }).includes("CODING") && (
                    <NumFieldInput name="weightCoding" label="Coding Weight %" />
                  )}
                  <NumFieldInput name="passPercentage" label="Passing Threshold %" />
                </div>
                <p className="text-[11px] text-muted">
                  Section weights apply to active section types and must sum exactly to 100% prior to publishing.
                </p>
              </Card>

              {/* Card 6: Candidate Feedback & Visibility */}
              <Card title="Candidate Result Feedback" icon={Eye} badge="Post-Exam">
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <CheckField name="mcqImmediate" label="Show MCQ provisional score immediately upon submit" />
                  <CheckField name="codingAfterSubmit" label="Show coding test results after grading" />
                  <CheckField name="showCorrectAnswers" label="Reveal correct answer keys to candidate" />
                  <CheckField name="showHiddenTestDetails" label="Show hidden test case inputs (not recommended)" />
                </div>
              </Card>

              {/* Card 7: Sections & Questions */}
              <Card title="Curated Assessment Sections" icon={Layers} badge={`${blueprint.totalSections} Sections`}>
                {sections.fields.map((f, i) => (
                  <SectionCard key={f.id} index={i} onRemove={() => sections.remove(i)} />
                ))}
                <div className="flex flex-wrap gap-2.5 pt-2">
                  <button
                    type="button"
                    className="btn btn-quiet btn-sm text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    onClick={() => sections.append({ title: "Core Multiple Choice", type: "MCQ", items: [] })}
                  >
                    <Plus className="h-3 w-3" />
                    <span>+ Add MCQ Section</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-quiet btn-sm text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    onClick={() => sections.append({ title: "Coding & Algorithms", type: "CODING", items: [] })}
                  >
                    <Plus className="h-3 w-3" />
                    <span>+ Add Coding Section</span>
                  </button>
                </div>
              </Card>
            </fieldset>

            {clientErrors.length > 0 && (
              <div role="alert" className="panel rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-700 dark:text-rose-400 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <span>Action Required:</span>
                </div>
                <ul className="list-disc pl-5 space-y-0.5">
                  {clientErrors.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </div>
            )}
            {(save.isError || publish.isError || copy.isError) && (
              <ErrorPanel error={save.error ?? publish.error ?? copy.error} />
            )}
          </div>

          {/* Sticky Blueprint Sidebar */}
          <div className="space-y-6">
            <div className="panel p-5 rounded-2xl border border-line bg-panel shadow-xs sticky top-6 space-y-5">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <h3 className="text-sm font-bold text-ink">Blueprint Summary</h3>
                </div>
                <span className="text-[10px] font-mono text-muted">Real-Time</span>
              </div>

              {/* Dynamic Stats Grid */}
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-3 rounded-xl bg-sunk/30 border border-line">
                  <div className="text-[10px] font-bold text-muted uppercase">Sections</div>
                  <div className="text-xl font-extrabold text-ink font-mono mt-0.5">
                    {blueprint.totalSections}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-sunk/30 border border-line">
                  <div className="text-[10px] font-bold text-muted uppercase">Questions</div>
                  <div className="text-xl font-extrabold text-ink font-mono mt-0.5">
                    {blueprint.totalQuestions}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-sunk/30 border border-line">
                  <div className="text-[10px] font-bold text-muted uppercase">Total Points</div>
                  <div className="text-xl font-extrabold text-ink font-mono mt-0.5">
                    {blueprint.totalPoints}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-sunk/30 border border-line">
                  <div className="text-[10px] font-bold text-muted uppercase">Duration</div>
                  <div className="text-xl font-extrabold text-ink font-mono mt-0.5">
                    {duration}m
                  </div>
                </div>
              </div>

              {/* Weight Distribution Ticker */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between font-semibold">
                  <span className="text-muted">Weight Distribution</span>
                  <span className={`font-mono font-bold ${blueprint.isWeightValid ? "text-emerald-600" : "text-amber-500"}`}>
                    {blueprint.presentTypes.length > 0 ? `${(weightMcq || 0) + (weightCoding || 0)}%` : "0%"}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-sunk overflow-hidden flex">
                  <div style={{ width: `${weightMcq || 0}%` }} className="bg-sky-500 transition-all"></div>
                  <div style={{ width: `${weightCoding || 0}%` }} className="bg-purple-500 transition-all"></div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted">
                  <span>MCQ: {weightMcq || 0}%</span>
                  <span>Coding: {weightCoding || 0}%</span>
                </div>
              </div>

              {/* Readiness Checklist */}
              <div className="space-y-2 border-t border-line pt-4 text-xs">
                <div className="font-semibold text-ink">Publishing Checklist</div>
                <div className="flex items-center gap-2 text-muted">
                  <CheckCircle2
                    className={`h-3.5 w-3.5 ${blueprint.totalSections > 0 ? "text-emerald-500" : "text-slate-400"}`}
                  />
                  <span>At least one section created</span>
                </div>
                <div className="flex items-center gap-2 text-muted">
                  <CheckCircle2
                    className={`h-3.5 w-3.5 ${blueprint.totalQuestions > 0 ? "text-emerald-500" : "text-slate-400"}`}
                  />
                  <span>At least one question pinned</span>
                </div>
                <div className="flex items-center gap-2 text-muted">
                  <CheckCircle2
                    className={`h-3.5 w-3.5 ${blueprint.isWeightValid ? "text-emerald-500" : "text-slate-400"}`}
                  />
                  <span>Active section weights total 100%</span>
                </div>
              </div>

              {!readOnly && (
                <div className="pt-2 flex flex-col gap-2">
                  <button
                    type="button"
                    disabled={save.isPending}
                    onClick={onSave}
                    className="w-full btn btn-quiet text-xs font-semibold py-2.5 cursor-pointer"
                  >
                    {save.isPending ? "Saving Draft…" : "Save Draft"}
                  </button>
                  {editing && (
                    <button
                      type="button"
                      disabled={publish.isPending}
                      onClick={onPublish}
                      className="w-full btn btn-primary text-xs font-bold py-2.5 cursor-pointer shadow-xs"
                    >
                      {publish.isPending ? "Publishing…" : "Publish Assessment"}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </form>
      </div>
    </FormProvider>
  );
}
