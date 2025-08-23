import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  uploadMenuCSV,
} from '../../../api/dashboard';

export interface MobileMenuItem {
  menu_item_id: number;
  name: string;
  category?: string | null;
  price: number;
  is_active: boolean;
}

export function useMenuItems() {
  const queryClient = useQueryClient();

  const {
    data: menuItems = [],
    isLoading: loading,
    error,
  } = useQuery<MobileMenuItem[], Error>({
    queryKey: ['menuItems'],
    queryFn: getMenuItems,
  });

  const createMutation = useMutation<MobileMenuItem, Error, any>({
    mutationFn: createMenuItem,
    onSuccess: newItem => {
      queryClient.setQueryData<MobileMenuItem[] | undefined>(['menuItems'], old => [
        ...(old || []),
        newItem,
      ]);
    },
    onMutate: variables => {
      console.debug('[menu:create] payload', variables);
    },
    onError: (err, _vars) => {
      console.debug('[menu:create] error', err?.message || err);
    },
  });

  const updateMutation = useMutation<MobileMenuItem, Error, { id: number; data: any }>({
    mutationFn: ({ id, data }) => {
      console.debug('[menu:update] sending', { id, data });
      return updateMenuItem(id, data);
    },
    onSuccess: updated => {
      queryClient.setQueryData<MobileMenuItem[] | undefined>(['menuItems'], old =>
        (old || []).map(i => (i.menu_item_id === updated.menu_item_id ? updated : i))
      );
    },
    onError: (err, vars) => {
      console.debug('[menu:update] error', { err: err?.message || err, vars });
    },
  });

  const deleteMutation = useMutation<void, Error, number>({
    mutationFn: id => deleteMenuItem(id),
    onSuccess: (_res, id) => {
      queryClient.setQueryData<MobileMenuItem[] | undefined>(['menuItems'], old =>
        (old || []).filter(i => i.menu_item_id !== id)
      );
    },
  });

  const uploadCsvMutation = useMutation<any, Error, any>({
    mutationFn: uploadMenuCSV,
    onSuccess: uploaded => {
      queryClient.setQueryData<MobileMenuItem[] | undefined>(['menuItems'], old => [
        ...(old || []),
        ...(uploaded || []),
      ]);
    },
  });

  const handleCreateMenuItem = async (itemData: any) => {
    // Normalize create payload to match backend DTO (MenuItemCreate)
    const payload: any = {};
    if (itemData.name != null && String(itemData.name).trim() !== '')
      payload.name = String(itemData.name).trim();
    payload.category = itemData.category === '' ? null : itemData.category ?? null;
    if (itemData.price != null) {
      const p = Number(itemData.price);
      if (!Number.isNaN(p)) payload.price = p;
    }
    if (itemData.is_active != null) payload.is_active = !!itemData.is_active;

    const res = await createMutation.mutateAsync(payload);
    return res;
  };

  const handleUpdateMenuItem = async (id: number, itemData: any) => {
    // Build update payload only with fields allowed by MenuItemUpdate
    const payload: any = {};
    if ('name' in itemData && itemData.name != null && String(itemData.name).trim() !== '')
      payload.name = String(itemData.name).trim();
    if ('category' in itemData)
      payload.category = itemData.category === '' ? null : itemData.category;
    if ('price' in itemData && itemData.price != null) {
      const p = Number(itemData.price);
      if (!Number.isNaN(p)) payload.price = p;
    }
    if ('is_active' in itemData && itemData.is_active != null)
      payload.is_active = !!itemData.is_active;

    // Some backend DTOs require is_active to be present; if caller didn't provide it, default
    // to the current value from cache so update payload is acceptable.
    if (!('is_active' in payload)) {
      const existing = (menuItems || []).find(mi => mi.menu_item_id === id);
      if (existing) payload.is_active = !!existing.is_active;
      else payload.is_active = true;
    }

    if (Object.keys(payload).length === 0) {
      // Nothing to update
      throw new Error('No valid fields provided to update');
    }

    const res = await updateMutation.mutateAsync({ id, data: payload });
    return res;
  };

  const handleDeleteMenuItem = async (id: number) => {
    await deleteMutation.mutateAsync(id);
  };

  const handleUploadCSV = async (file: any) => {
    const res = await uploadCsvMutation.mutateAsync(file);
    return res;
  };

  return useMemo(
    () => ({
      menuItems,
      loading,
      error,
      handleCreateMenuItem,
      handleUpdateMenuItem,
      handleDeleteMenuItem,
      handleUploadCSV,
    }),
    [menuItems, loading, error]
  );
}
