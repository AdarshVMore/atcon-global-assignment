import { LoadingState } from "@/components/layout/loading-state";

export default function RootLoading() {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="w-full max-w-md">
        <LoadingState />
      </div>
    </div>
  );
}
