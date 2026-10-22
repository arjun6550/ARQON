import { Route, Routes } from "react-router-dom";
import { RequireRole } from "./components/RequireRole";
import { PortalLayout } from "./layouts/PortalLayout";
import { AdminPortal } from "./pages/AdminPortal";
import { AssessmentEditorPage } from "./pages/AssessmentEditorPage";
import { AssessmentsPage } from "./pages/AssessmentsPage";
import { InvitationsPage } from "./pages/InvitationsPage";
import { InvitePage } from "./pages/InvitePage";
import { ExamPage } from "./pages/ExamPage";
import { DemoExamPage } from "./pages/DemoExamPage";
import { ResultsPage } from "./pages/ResultsPage";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { OrgHomePage } from "./pages/OrgHomePage";
import { PortalPlaceholder } from "./pages/PortalPlaceholder";
import { QuestionEditorPage } from "./pages/QuestionEditorPage";
import { QuestionsPage } from "./pages/QuestionsPage";
import { StatusPage } from "./pages/StatusPage";
import { SuperAdminPortal } from "./pages/SuperAdminPortal";

export function App() {
  return (
    <Routes>
      <Route element={<PortalLayout />}>
        <Route index element={<HomePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="status" element={<StatusPage />} />
        <Route path="invite" element={<InvitePage />} />
        <Route path="exam" element={<ExamPage />} />
        <Route path="demo-exam" element={<DemoExamPage />} />
        <Route element={<RequireRole roles={["SUPER_ADMIN"]} />}>
          <Route path="super-admin/*" element={<SuperAdminPortal />} />
        </Route>
        <Route element={<RequireRole roles={["ORG_ADMIN"]} />}>
          <Route path="admin/*" element={<AdminPortal />} />
        </Route>
        <Route element={<RequireRole roles={["RECRUITER"]} />}>
          <Route path="recruiter/*" element={<OrgHomePage title="Recruiter Portal" />} />
        </Route>
        <Route element={<RequireRole roles={["RECRUITER", "ORG_ADMIN"]} />}>
          <Route path="questions" element={<QuestionsPage />} />
          <Route path="questions/new" element={<QuestionEditorPage />} />
          <Route path="questions/:id" element={<QuestionEditorPage />} />
          <Route path="assessments" element={<AssessmentsPage />} />
          <Route path="assessments/new" element={<AssessmentEditorPage />} />
          <Route path="assessments/:id" element={<AssessmentEditorPage />} />
          <Route path="assessments/:id/invitations" element={<InvitationsPage />} />
          <Route path="assessments/:id/results" element={<ResultsPage />} />
        </Route>
        <Route element={<RequireRole roles={["PROCTOR"]} />}>
          <Route path="proctor/*" element={<OrgHomePage title="Proctor Portal" />} />
        </Route>
        <Route path="candidate/*" element={<PortalPlaceholder path="/candidate" />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
