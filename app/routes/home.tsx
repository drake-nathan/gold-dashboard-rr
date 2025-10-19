import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";

import type { Route } from "./+types/home";

// eslint-disable-next-line no-empty-pattern
export const meta = ({}: Route.MetaArgs) => [
  { title: "New React Router App" },
  { content: "Welcome to React Router!", name: "description" },
];

const Home = () => {
  const stats = useQuery(api.dashboard.getStats);

  return <div>{stats?.lastFetch?.timestamp}</div>;
};

export default Home;
