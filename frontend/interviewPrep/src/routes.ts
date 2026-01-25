import { createBrowserRouter } from "react-router";
import { LandingPage } from "./components/LandingPage";
import { LoginPage } from "./components/LoginPage";
import { SignupPage } from "./components/SignupPage";
import { Dashboard } from "./components/Dashboard";
import { InterviewDetail } from "./components/InterviewDetail";
import { AISimulation } from "./components/AISimulation";
import { AddInterview } from "./components/AddInterview";
import { Profile } from "./components/Profile";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: LandingPage,
  },
  {
    path: "/login",
    Component: LoginPage,
  },
  {
    path: "/signup",
    Component: SignupPage,
  },
  {
    path: "/dashboard",
    Component: Dashboard,
  },
  {
    path: "/profile",
    Component: Profile,
  },
  {
    path: "/add-interview",
    Component: AddInterview,
  },
  {
    path: "/job/:id",
    Component: InterviewDetail,
  },
  {
    path: "/simulate/:id",
    Component: AISimulation,
  },
]);