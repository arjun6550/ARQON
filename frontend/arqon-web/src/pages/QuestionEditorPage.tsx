import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { ErrorPanel } from "../components/ErrorPanel";
import { Skeleton } from "../components/Skeleton";
import { useToast } from "../components/Toaster";
import { apiFetch, jsonInit } from "../lib/apiClient";
import {
  LANGUAGES, detailToForm, emptyForm, formToRequest, languageLabels, questionDetailSchema, validateQuestionForm,
  versionSummarySchema, type QuestionFormValues,
} from "../lib/questions";

export function QuestionEditorPage() {
  const { id } = useParams();
  const editing = id !== undefined;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const [clientErrors, setClientErrors] = useState<string[]>([]);

  const detail = useQuery({
    queryKey: ["question", id],
    enabled: editing,
    queryFn: () => apiFetch(`/api/v1/questions/${id}`, questionDetailSchema),
  });
  const history = useQuery({
    queryKey: ["question", id, "versions"],
    enabled: editing,
    queryFn: () => apiFetch(`/api/v1/questions/${id}/versions`, z.array(versionSummarySchema)),
  });

  const { register, handleSubmit, control, watch, reset } = useForm<QuestionFormValues>({ defaultValues: emptyForm() });
  const options = useFieldArray({ control, name: "options" });
  const testCases = useFieldArray({ control, name: "testCases" });
  const type = watch("type");
  const languages = watch("languages");

  useEffect(() => {
    if (detail.data) reset(detailToForm(detail.data));
  }, [detail.data, reset]);

  const save = useMutation({
    mutationFn: (v: QuestionFormValues) =>
      editing
        ? apiFetch(`/api/v1/questions/${id}`, questionDetailSchema, jsonInit("PUT", formToRequest(v, detail.data?.currentVersion)))
        : apiFetch("/api/v1/questions", questionDetailSchema, jsonInit("POST", formToRequest(v))),
    onSuccess: async () => {
      toast.show(editing ? "New version saved" : "Question created");
      await qc.invalidateQueries({ queryKey: ["questions"] });
      await qc.invalidateQueries({ queryKey: ["question", id] });
      navigate("/questions");
    },
  });

  const onSubmit = handleSubmit((values) => {
    const errors = validateQuestionForm(values);
    setClientErrors(errors);
    if (errors.length === 0) save.mutate(values);
  });

  if (editing && detail.isPending) return <div className="space-y-3" role="status" aria-label="Loading"><Skeleton className="h-8 w-1/3" /><Skeleton className="h-64" /></div>;
  if (editing && detail.isError) return <ErrorPanel error={detail.error} />;
  const archived = detail.data?.status === "ARCHIVED";

  return (
    <>
      <Link to="/questions" className="link-action text-sm">← Question bank</Link>
      <h1 className="page-title mt-2">{editing ? "Edit question" : "New question"}</h1>
      {editing && detail.data && (
        <p className="mt-1 text-sm text-muted">
          Current version: v{detail.data.currentVersion}. Saving creates v{detail.data.currentVersion + 1}; assessments keep using the version they reference.
        </p>
      )}
      {archived && <p role="alert" className="mt-2 text-danger">This question is archived and cannot be edited.</p>}

      <form onSubmit={onSubmit} className="mt-6 space-y-5" noValidate>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="text-sm font-medium">Type
            <select disabled={editing} className="border mt-1 w-full px-3 py-2 font-normal" {...register("type")}>
              <option value="MCQ">Multiple choice</option><option value="CODING">Coding</option>
            </select>
          </label>
          <label className="text-sm font-medium">Difficulty
            <select className="border mt-1 w-full px-3 py-2 font-normal" {...register("difficulty")}>
              <option value="EASY">Easy</option><option value="MEDIUM">Medium</option><option value="HARD">Hard</option>
            </select>
          </label>
          <label className="text-sm font-medium">Tags (comma separated)
            <input className="border mt-1 w-full px-3 py-2 font-normal" placeholder="java, arrays" {...register("tags")} />
          </label>
        </div>

        <label className="block text-sm font-medium">Title
          <input className="border mt-1 w-full px-3 py-2 font-normal" {...register("title")} />
        </label>
        <label className="block text-sm font-medium">Question text
          <textarea rows={5} className="border mt-1 w-full px-3 py-2 font-normal" {...register("body")} />
        </label>

        {type === "MCQ" && (
          <fieldset className="panel space-y-2 p-4">
            <legend className="px-1 text-sm font-medium">Options</legend>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...register("multipleCorrect")} /> Allow multiple correct answers</label>
            {options.fields.map((field, i) => (
              <div key={field.id} className="flex items-center gap-2">
                <input type="checkbox" aria-label={`Option ${i + 1} is correct`} {...register(`options.${i}.correct`)} />
                <input aria-label={`Option ${i + 1} text`} className="border flex-1 px-3 py-2" {...register(`options.${i}.text`)} />
                <button type="button" className="link-action text-xs" disabled={options.fields.length <= 2} onClick={() => options.remove(i)}>Remove</button>
              </div>
            ))}
            <button type="button" className="link-action text-sm" disabled={options.fields.length >= 8} onClick={() => options.append({ text: "", correct: false })}>Add option</button>
          </fieldset>
        )}

        {type === "CODING" && (
          <div className="panel space-y-4 p-4">
            <div>
              <p className="text-sm font-medium">Allowed languages</p>
              <div className="mt-1 flex flex-wrap gap-4 text-sm">
                {LANGUAGES.map((l) => (
                  <label key={l} className="flex items-center gap-1"><input type="checkbox" value={l} {...register("languages")} /> {languageLabels[l]}</label>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium">Time limit (ms)
                <input type="number" className="border mt-1 w-full px-3 py-2 font-normal" {...register("timeLimitMs", { valueAsNumber: true })} />
              </label>
              <label className="text-sm font-medium">Memory limit (MB)
                <input type="number" className="border mt-1 w-full px-3 py-2 font-normal" {...register("memoryLimitMb", { valueAsNumber: true })} />
              </label>
            </div>
            {LANGUAGES.filter((l) => languages.includes(l)).map((l) => (
              <label key={l} className="block text-sm font-medium">Starter code: {languageLabels[l]}
                <textarea rows={4} className="border mt-1 w-full px-3 py-2 font-mono text-xs font-normal" {...register(`starter.${l}`)} />
              </label>
            ))}
            <div>
              <p className="text-sm font-medium">Test cases</p>
              <p className="text-xs text-muted">Hidden test cases are never shown to candidates.</p>
              {testCases.fields.map((field, i) => (
                <div key={field.id} className="mt-2 grid gap-2 rounded-xl border border-line p-3 sm:grid-cols-6">
                  <textarea aria-label={`Test ${i + 1} input`} placeholder="input" rows={2} className="border px-2 py-1 font-mono text-xs sm:col-span-2" {...register(`testCases.${i}.input`)} />
                  <textarea aria-label={`Test ${i + 1} expected output`} placeholder="expected output" rows={2} className="border px-2 py-1 font-mono text-xs sm:col-span-2" {...register(`testCases.${i}.expectedOutput`)} />
                  <input aria-label={`Test ${i + 1} weight`} type="number" min={1} max={100} className="border px-2 py-1" {...register(`testCases.${i}.weight`, { valueAsNumber: true })} />
                  <div className="flex items-center justify-between text-xs">
                    <label className="flex items-center gap-1"><input type="checkbox" {...register(`testCases.${i}.hidden`)} /> Hidden</label>
                    <button type="button" className="link-action" disabled={testCases.fields.length <= 1} onClick={() => testCases.remove(i)}>Remove</button>
                  </div>
                </div>
              ))}
              <button type="button" className="mt-2 text-sm underline" disabled={testCases.fields.length >= 50}
                onClick={() => testCases.append({ input: "", expectedOutput: "", hidden: false, weight: 1 })}>Add test case</button>
            </div>
          </div>
        )}

        {clientErrors.length > 0 && (
          <ul role="alert" className="list-disc rounded-xl border border-[var(--color-danger-line)] bg-bad-bg p-4 pl-8 text-sm text-danger">
            {clientErrors.map((e) => (<li key={e}>{e}</li>))}
          </ul>
        )}
        {save.isError && <ErrorPanel error={save.error} />}

        <button disabled={save.isPending || archived} className="btn btn-primary">
          {save.isPending ? "Saving…" : editing ? "Save as new version" : "Create question"}
        </button>
      </form>

      {editing && history.data && (
        <>
          <h2 className="section-title mt-10">Version history</h2>
          <ul className="panel mt-2 divide-y text-sm">
            {history.data.map((v) => (
              <li key={v.version} className="flex justify-between px-4 py-2"><span>v{v.version} · {v.title}</span><span className="text-muted">{new Date(v.createdAt).toLocaleString()}</span></li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
