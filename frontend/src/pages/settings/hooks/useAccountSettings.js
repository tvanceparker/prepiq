import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    getAccountInfo,
    updateUserPreferences,
    updateEmail,
    updatePhone,
    changePassword,
} from "../../../api/settings";

export function useAccountSettings() {
    const queryClient = useQueryClient();

    // Fetch account info with React Query
    const {
        data: accountInfo,
        isLoading: loadingAccountInfo,
        error: errorAccountInfo,
    } = useQuery({
        queryKey: ["accountInfo"],
        queryFn: getAccountInfo,
    });

    // Mutation for saving preferences
    const savePreferencesMutation = useMutation({
        mutationFn: updateUserPreferences,
        onSuccess: (updatedPreferences) => {
            queryClient.setQueryData(["accountInfo"], (old) => ({
                ...old,
                preferences: updatedPreferences,
            }));
        },
    });

    // Mutation for updating email
    const updateEmailMutation = useMutation({
        mutationFn: updateEmail,
        onSuccess: (_, variables) => {
            queryClient.setQueryData(["accountInfo"], (old) => ({
                ...old,
                email: variables.newEmail,
            }));
        },
    });

    // Mutation for updating phone
    const updatePhoneMutation = useMutation({
        mutationFn: updatePhone,
        onSuccess: (_, variables) => {
            queryClient.setQueryData(["accountInfo"], (old) => ({
                ...old,
                phone: variables.newPhone,
            }));
        },
    });

    // Mutation for changing password
    const changePasswordMutation = useMutation({
        mutationFn: changePassword,
    });

    return {
        accountInfo,
        loadingAccountInfo,
        errorAccountInfo,

        // Combined loading and error states for mutations
        updateLoading:
            savePreferencesMutation.isLoading ||
            updateEmailMutation.isLoading ||
            updatePhoneMutation.isLoading ||
            changePasswordMutation.isLoading,

        updateError:
            savePreferencesMutation.error ||
            updateEmailMutation.error ||
            updatePhoneMutation.error ||
            changePasswordMutation.error,

        savePreferences: savePreferencesMutation.mutateAsync,
        updateUserEmail: updateEmailMutation.mutateAsync,
        updateUserPhone: updatePhoneMutation.mutateAsync,
        changeUserPassword: changePasswordMutation.mutateAsync,
    };
}
