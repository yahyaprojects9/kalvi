import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

// Singleton instances to avoid re-creation on re-renders
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const router = createRouter({
  routeTree,
  context: { queryClient },
  scrollRestoration: false, // Disable for mobile stability
  defaultPreloadStaleTime: 0,
});

export const getRouter = () => {
  return router;
};

export const getQueryClient = () => {
  return queryClient;
};
