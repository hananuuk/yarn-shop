import { LoopMark } from "@/components/Storybook";

// loop's mark: a little striped worm curled into a loop.
export function Logo({ size = 40 }: { size?: number }) {
  return <LoopMark size={size} />;
}
