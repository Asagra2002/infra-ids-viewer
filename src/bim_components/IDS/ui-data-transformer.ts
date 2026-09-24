import { IDSCheckResult } from './index';

/**
 * Transforma los resultados de IDSValidator a formato optimizado para UI
 */
export class UIDataTransformer {
  /**
   * Convierte resultados de validación a formato UI-friendly
   */
  static transformToUI(
    report: ReturnType<typeof import('./index').IDSValidator.prototype.generateEnhancedReport>
  ) {
    return {
      summary: {
        ...report.summary,
        stats: [
          { label: "Total elementos", value: report.summary.total, color: "neutral" },
          { label: "Pasaron", value: report.summary.passed, color: "success" },
          { label: "Fallaron", value: report.summary.failed, color: "error" },
          { label: "Tasa de éxito", value: `${report.summary.passRate.toFixed(2)}%`, color: report.summary.passRate >= 80 ? "success" : report.summary.passRate >= 50 ? "warning" : "error" }
        ],
        koodistoInfo: {
          label: "Con información de códigos",
          value: report.summary.withKoodistoInfo,
          tooltip: "Checks que tienen referencias a koodistot oficiales"
        }
      },
      failures: report.failures.map((failure, idx) => ({
        id: `failure-${idx}`,
        header: {
          entityType: failure.entityType,
          entityName: failure.entityName,
          expressID: failure.expressID,
          guid: failure.guid,
          status: "failed" as const,
          checksCount: failure.checks.length,
          expandable: true
        },
        checks: failure.checks.map((check, checkIdx) => ({
          id: `check-${idx}-${checkIdx}`,
          property: {
            set: check.propertySet || "",
            name: check.propertyName || "",
            displayName: check.ravaInfo?.attribuutti || check.propertyName || ""
          },
          status: {
            type: check.status,
            label: this.getStatusLabel(check.status),
            icon: this.getStatusIcon(check.status),
            color: this.getStatusColor(check.status)
          },
          details: {
            message: check.details,
            context: check.ravaInfo ? {
              luokka: check.ravaInfo.luokka,
              attribuutti: check.ravaInfo.attribuutti,
              kommentti: check.ravaInfo.kommentti
            } : undefined
          },
          help: check.ravaInfo ? {
            linkki: check.ravaInfo.linkki,
            tayttoohje: check.ravaInfo.tayttoohje,
            kayttotarkoitus: check.ravaInfo.kayttotarkoitus
          } : undefined,
          koodisto: check.ravaInfo?.koodistoUri ? {
            name: check.ravaInfo.koodisto,
            uri: check.ravaInfo.koodistoUri,
            validValues: check.koodistoValidation?.validValues,
            showDropdown: !!check.koodistoValidation?.validValues && check.koodistoValidation.validValues.length > 0,
            suggestedCorrection: check.koodistoValidation?.validValues?.[0]?.label
          } : undefined,
          actions: this.generateActions(check, failure.expressID)
        }))
      })),
      koodistoReferences: report.koodistoReferences.map(ref => ({
        name: ref.name,
        uri: ref.uri,
        usedIn: ref.usedInChecks,
        link: ref.uri
      }))
    };
  }

  private static getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      missing: "Falta",
      invalid: "Inválido",
      invalid_value: "Valor incorrecto",
      invalid_type: "Tipo incorrecto",
      invalid_pattern: "Patrón incorrecto",
      out_of_range: "Fuera de rango"
    };
    return labels[status] || status;
  }

  private static getStatusIcon(status: string): "error" | "warning" | "info" | "success" {
    if (status === "missing") return "error";
    if (status.includes("invalid")) return "warning";
    return "info";
  }

  private static getStatusColor(status: string): "red" | "orange" | "blue" | "green" {
    if (status === "missing") return "red";
    if (status.includes("invalid")) return "orange";
    return "blue";
  }

  private static generateActions(check: any, expressID: number) {
    const actions = [];

    if (check.ravaInfo?.linkki) {
      actions.push({
        type: "view_docs",
        label: "Ver documentación",
        link: check.ravaInfo.linkki
      });
    }

    if (check.ravaInfo?.koodistoUri) {
      actions.push({
        type: "view_koodisto",
        label: "Ver código oficial",
        link: check.ravaInfo.koodistoUri
      });
    }

    actions.push({
      type: "highlight_element",
      label: "Resaltar en viewer",
      expressID
    });

    if (check.koodistoValidation?.validValues && check.koodistoValidation.validValues.length > 0) {
      actions.push({
        type: "suggest_correction",
        label: "Sugerir corrección",
        value: check.koodistoValidation.validValues[0].label
      });
    }

    return actions;
  }
}
