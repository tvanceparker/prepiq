# React Query Mutation Usage Guidelines (v5)

## Important: Always specify `mutationFn` explicitly

In React Query v5, `useMutation` requires the mutation function to be passed inside an options object with the key `mutationFn`.  
Passing the mutation function directly as a standalone argument will cause this error:


---

## Correct Usage Example

```jsx
import { useMutation } from "@tanstack/react-query";

export default function Example() {
  const mutation = useMutation({
    mutationFn: async () => {
      // Your mutation logic here
      return "ok";
    }
  });

  return (
    <button onClick={() => mutation.mutate()}>
      Test Mutation
    </button>
  );
}

import { useQuery } from "@tanstack/react-query";

export default function Example() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["someKey"],
    queryFn: async () => {
      // Your fetch logic here
      return await fetchData();
    }
  });

  if (isLoading) return <p>Loading...</p>;
  if (error) return <p>Error!</p>;

  return <div>{JSON.stringify(data)}</div>;
}

import { useMutation, useQueryClient } from "@tanstack/react-query";

function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateSettingsAPI,
    onSuccess: (newData) => {
      queryClient.setQueryData(["settings"], newData);
    }
  });
}
```
