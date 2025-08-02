// src/pages/admin/hooks/useActivityLogs.ts
import { useQuery } from "@tanstack/react-query";
import { getActivityLogs } from "../../../api/admin";
import { ActivityLogResponse } from "../../../interfaces/adminInterfaces";

export function useActivityLogs() {
    return useQuery < ActivityLogResponse[] > ({
        queryKey: ["activityLogs"],
        queryFn: getActivityLogs,
        staleTime: 1000 * 60 * 5,
        retry: 1,
    });
}
