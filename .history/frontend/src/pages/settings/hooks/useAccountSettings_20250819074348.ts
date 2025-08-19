import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAccountInfo,
  updateUserPreferences,
  updateEmail,
  updatePhone,
  changePassword,
} from "../../../api/settings";
import type { AccountInfo } from "../../../interfaces/settings";

export function useAccountSettings() {
  const queryClient = useQueryClient();

  const { data: accountInfo, isLoading: loadingAccountInfo, error: errorAccountInfo } = useQuery<AccountInfo>({
    queryKey: ["accountInfo"],
    queryFn: getAccountInfo,
  });

  const savePreferencesMutation = useMutation({
    mutationFn: updateUserPreferences,
    onSuccess: (updatedPreferences: any) => {
      queryClient.setQueryData(["accountInfo"], (old: any) => ({
        ...old,
        preferences: updatedPreferences,
      }));
    },
  });

  const updateEmailMutation = useMutation({
    mutationFn: updateEmail,
    onSuccess: (_, variables: any) => {
      queryClient.setQueryData(["accountInfo"], (old: any) => ({
        ...old,
        email: variables.newEmail,
      }));
    },
  });

  const updatePhoneMutation = useMutation({
    mutationFn: updatePhone,
    onSuccess: (_, variables: any) => {
      queryClient.setQueryData(["accountInfo"], (old: any) => ({
        ...old,
        phone: variables.newPhone,
      }));
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: changePassword,
  });

  return {
    accountInfo,
    loadingAccountInfo,
    errorAccountInfo,

    updateLoading:
      savePreferencesMutation.status === "loading" ||
      updateEmailMutation.status === "loading" ||
      updatePhoneMutation.status === "loading" ||
      changePasswordMutation.status === "loading",

    updateError:
      (savePreferencesMutation.error as any) ||
      (updateEmailMutation.error as any) ||
      (updatePhoneMutation.error as any) ||
      (changePasswordMutation.error as any),

    savePreferences: savePreferencesMutation.mutateAsync,
    updateUserEmail: updateEmailMutation.mutateAsync,
    updateUserPhone: updatePhoneMutation.mutateAsync,
    changeUserPassword: changePasswordMutation.mutateAsync,
  };
}
