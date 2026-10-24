import { connection } from "next/server";
import HomeClient from "../home-client";

export default async function PlannerPage() {
  await connection();
  return <HomeClient />;
}
