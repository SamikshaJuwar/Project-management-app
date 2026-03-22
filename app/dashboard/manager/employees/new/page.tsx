// app/dashboard/manager/employees/new/page.tsx

import { EmployeeForm } from "../_components/EmployeeForm";

export default function NewEmployeePage() {
  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Add Employee</h1>
      <EmployeeForm />
    </div>
  );
}