import { PageTitle } from "@/components/layout/page-title";
import { SettingsForm } from "@/components/configuracion/settings-form";
import { GoogleSheetForm } from "@/components/configuracion/google-sheet-form";
import { UsersTable } from "@/components/configuracion/users-table";
import { getCompanySettings, getProfiles } from "@/services/companyService";

export default async function ConfiguracionPage() {
  const [settings, profiles] = await Promise.all([
    getCompanySettings(),
    getProfiles(),
  ]);

  return (
    <>
      <PageTitle
        title="Configuración"
        description="Ajustes del sistema y usuarios"
      />
      <div className="space-y-6">
        <SettingsForm settings={settings} />
        <GoogleSheetForm settings={settings} />
        <UsersTable users={profiles} />
      </div>
    </>
  );
}
