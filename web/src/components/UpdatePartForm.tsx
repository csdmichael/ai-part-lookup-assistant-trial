import type { FormEvent } from 'react';
import { useState } from 'react';
import type { FieldError, LifecycleStatus, PartDetail, PartUpdate } from '../types';

interface UpdatePartFormProps {
  part: PartDetail;
  isSaving: boolean;
  serverErrors: FieldError[];
  onCancel: () => void;
  onSubmit: (changes: Partial<PartUpdate>) => void;
}

const LIFECYCLE_OPTIONS: LifecycleStatus[] = ['active', 'obsolete', 'pending-approval', 'restricted'];

type FormState = {
  inventoryLevel: string;
  reorderPoint: string;
  warehouseLocation: string;
  lifecycleStatus: LifecycleStatus;
};

/** Client-side rules intentionally mirror the server contract so feedback is immediate. */
export function validate(values: FormState): Record<string, string> {
  const errors: Record<string, string> = {};
  const inventoryLevel = Number(values.inventoryLevel);
  const reorderPoint = Number(values.reorderPoint);

  if (values.inventoryLevel.trim() === '' || !Number.isInteger(inventoryLevel)) {
    errors.inventoryLevel = 'Inventory level must be a whole number';
  } else if (inventoryLevel < 0) {
    errors.inventoryLevel = 'Inventory level cannot be negative';
  }

  if (values.reorderPoint.trim() === '' || !Number.isInteger(reorderPoint)) {
    errors.reorderPoint = 'Reorder point must be a whole number';
  } else if (reorderPoint < 0) {
    errors.reorderPoint = 'Reorder point cannot be negative';
  } else if (values.lifecycleStatus === 'obsolete' && reorderPoint > 0) {
    errors.reorderPoint = 'Obsolete parts must have a reorder point of 0';
  }

  if (!/^[A-Za-z0-9-]{3,32}$/.test(values.warehouseLocation.trim())) {
    errors.warehouseLocation = 'Warehouse location may only contain letters, numbers and hyphens';
  }

  return errors;
}

export function UpdatePartForm({ part, isSaving, serverErrors, onCancel, onSubmit }: UpdatePartFormProps) {
  const [values, setValues] = useState<FormState>({
    inventoryLevel: String(part.inventoryLevel),
    reorderPoint: String(part.reorderPoint),
    warehouseLocation: part.warehouseLocation,
    lifecycleStatus: part.lifecycleStatus
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const combinedErrors: Record<string, string> = { ...errors };
  serverErrors.forEach((error) => {
    combinedErrors[error.field] = combinedErrors[error.field] ?? error.message;
  });

  function update<K extends keyof FormState>(field: K, value: FormState[K]) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationErrors = validate(values);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    onSubmit({
      inventoryLevel: Number(values.inventoryLevel),
      reorderPoint: Number(values.reorderPoint),
      warehouseLocation: values.warehouseLocation.trim(),
      lifecycleStatus: values.lifecycleStatus
    });
  }

  function describedBy(field: string): string | undefined {
    return combinedErrors[field] ? `${field}-error` : undefined;
  }

  return (
    <form className="panel" onSubmit={handleSubmit} noValidate aria-labelledby="update-part-heading">
      <h2 id="update-part-heading">Update {part.partNumber}</h2>
      <p className="muted">Cost and internal notes are read-only and cannot be changed here.</p>

      <div className="form-grid">
        <div className="field-group">
          <label className="field" htmlFor="inventoryLevel">
            Inventory level
          </label>
          <input
            id="inventoryLevel"
            name="inventoryLevel"
            type="number"
            inputMode="numeric"
            value={values.inventoryLevel}
            aria-invalid={combinedErrors.inventoryLevel ? true : undefined}
            aria-describedby={describedBy('inventoryLevel')}
            onChange={(event) => update('inventoryLevel', event.target.value)}
          />
          {combinedErrors.inventoryLevel ? (
            <p className="field-error" id="inventoryLevel-error" role="alert">
              {combinedErrors.inventoryLevel}
            </p>
          ) : null}
        </div>

        <div className="field-group">
          <label className="field" htmlFor="reorderPoint">
            Reorder point
          </label>
          <input
            id="reorderPoint"
            name="reorderPoint"
            type="number"
            inputMode="numeric"
            value={values.reorderPoint}
            aria-invalid={combinedErrors.reorderPoint ? true : undefined}
            aria-describedby={describedBy('reorderPoint')}
            onChange={(event) => update('reorderPoint', event.target.value)}
          />
          {combinedErrors.reorderPoint ? (
            <p className="field-error" id="reorderPoint-error" role="alert">
              {combinedErrors.reorderPoint}
            </p>
          ) : null}
        </div>

        <div className="field-group">
          <label className="field" htmlFor="warehouseLocation">
            Warehouse location
          </label>
          <input
            id="warehouseLocation"
            name="warehouseLocation"
            type="text"
            value={values.warehouseLocation}
            aria-invalid={combinedErrors.warehouseLocation ? true : undefined}
            aria-describedby={describedBy('warehouseLocation')}
            onChange={(event) => update('warehouseLocation', event.target.value)}
          />
          {combinedErrors.warehouseLocation ? (
            <p className="field-error" id="warehouseLocation-error" role="alert">
              {combinedErrors.warehouseLocation}
            </p>
          ) : null}
        </div>

        <div className="field-group">
          <label className="field" htmlFor="lifecycleStatus">
            Lifecycle status
          </label>
          <select
            id="lifecycleStatus"
            name="lifecycleStatus"
            value={values.lifecycleStatus}
            aria-describedby={describedBy('lifecycleStatus')}
            onChange={(event) => update('lifecycleStatus', event.target.value as LifecycleStatus)}
          >
            {LIFECYCLE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {combinedErrors.lifecycleStatus ? (
            <p className="field-error" id="lifecycleStatus-error" role="alert">
              {combinedErrors.lifecycleStatus}
            </p>
          ) : null}
        </div>
      </div>

      <div className="form-actions">
        <button type="submit" disabled={isSaving}>
          {isSaving ? 'Saving…' : 'Save changes'}
        </button>
        <button type="button" className="secondary" onClick={onCancel} disabled={isSaving}>
          Cancel
        </button>
      </div>
    </form>
  );
}
