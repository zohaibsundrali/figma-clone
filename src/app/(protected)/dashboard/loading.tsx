// Next.js App Router renders this instantly while the server component suspends.
// Import the same skeleton as the Suspense fallback so we never show a blank screen.
import { FileGridSkeleton } from "@/components/dashboard/FileGridSkeleton";

export default function DashboardLoading() {
  return <FileGridSkeleton />;
}
