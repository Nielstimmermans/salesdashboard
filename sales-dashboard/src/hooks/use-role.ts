import { useEffect, useState } from "react";

type Role = "admin" | "employee" | null;

/**
 * Hook to get the current user's role.
 * Fetches the employee record from the API to determine the role.
 *
 * TODO: Consider caching this in a React context provider
 * to avoid repeated API calls across components.
 */
export function useRole() {
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRole() {
      try {
        const response = await fetch("/api/employees/me");
        if (response.ok) {
          const data = await response.json();
          setRole(data.employee?.role || "employee");
        }
      } catch {
        setRole(null);
      } finally {
        setLoading(false);
      }
    }

    fetchRole();
  }, []);

  return {
    role,
    isAdmin: role === "admin",
    isEmployee: role === "employee",
    loading,
  };
}
