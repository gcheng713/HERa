import { queryClient } from "./queryClient";

export async function generateClinics() {
  const response = await fetch("/api/admin/generate-clinics", {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to start clinic generation");
  }

  return response.json();
}
