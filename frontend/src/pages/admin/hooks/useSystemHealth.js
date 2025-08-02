import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { checkEndOfDayWrites, runSalesDataCheck } from "../../../api/admin.ts";

const getYesterday = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().slice(0, 10);
};

export function useSystemHealth(initialDate) {
    const [checkDate, setCheckDate] = useState(initialDate || getYesterday());
    const queryClient = useQueryClient();

    // React Query's useQuery with object syntax (React Query v5)
    const {
        data,
        error,
        isLoading: loading,
        refetch,
    } = useQuery({
        queryKey: ["systemHealth", checkDate],
        queryFn: () => checkEndOfDayWrites(checkDate),
        enabled: !!checkDate, // only fetch if checkDate is truthy
        // retry: false, // optional: disable retry if you want
    });

    // Mutation for running sales check
    const {
        mutateAsync: runSalesCheck,
        isLoading: salesCheckLoading,
        isError: salesCheckError,
        reset: resetSalesCheck,
    } = useMutation({
        mutationFn: runSalesDataCheck,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["systemHealth", checkDate] });
        },
    });

    // Wrapper to safely set checkDate (same as your safeSetCheckDate)
    const safeSetCheckDate = useCallback((date) => {
        if (date instanceof Date) {
            setCheckDate(date.toISOString().slice(0, 10));
        } else if (typeof date === "string") {
            setCheckDate(date);
        } else {
            console.warn("Unexpected date format passed to setCheckDate", date);
        }
    }, []);

    // Return all needed states & functions
    return {
        data,
        loading,
        error,
        checkDate,
        setCheckDate: safeSetCheckDate,
        refresh: refetch,
        runSalesCheck,
        salesCheckLoading,
        salesCheckMessage: salesCheckError
            ? "Failed to trigger sales data check."
            : salesCheckLoading
                ? "Running Sales Data Check..."
                : null,
    };
}
