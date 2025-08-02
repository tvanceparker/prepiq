import { useMutation } from "@tanstack/react-query";

export default function Example() {
  const mutation = useMutation({
    mutationFn: () => Promise.resolve("ok"),
  });

  return <button onClick={() => mutation.mutate()}>Test Mutation</button>;
}
