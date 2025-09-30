import type { Route } from "./+types/home";

import { Welcome } from "../welcome/welcome";

// eslint-disable-next-line no-empty-pattern
export const meta = ({}: Route.MetaArgs) => [
  { title: "New React Router App" },
  { content: "Welcome to React Router!", name: "description" },
];

const Home = () => {
  return <Welcome />;
};

export default Home;
