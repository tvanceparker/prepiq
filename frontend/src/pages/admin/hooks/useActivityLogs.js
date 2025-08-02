import { useQuery } from "@tanstack/react-query";
import { getActivityLogs } from "../../../api/admin.ts";

export function useActivityLogs() {
    return useQuery({
        queryKey: ["activityLogs"],
        queryFn: getActivityLogs,
        staleTime: 1000 * 60 * 5, // cache for 5 min (optional)
        retry: 1, // retry once on failure (optional)
    });
}
