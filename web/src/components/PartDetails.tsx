import type { PartDetail } from '../types';

interface PartDetailsProps {
  part: PartDetail;
  onEdit: () => void;
}

export function PartDetails({ part, onEdit }: PartDetailsProps) {
  return (
    <section className="panel" aria-labelledby="part-detail-heading">
      <header className="panel-header">
        <div>
          <h2 id="part-detail-heading">
            {part.partNumber} · {part.partName}
          </h2>
          <p className="muted">{part.description}</p>
        </div>
        <button type="button" onClick={onEdit}>
          Update part
        </button>
      </header>

      <div className="detail-grid">
        <div>
          <h3>Inventory</h3>
          <dl>
            <dt>On hand</dt>
            <dd>
              {part.inventoryLevel} {part.unitOfMeasure}
            </dd>
            <dt>Reorder point</dt>
            <dd>{part.reorderPoint}</dd>
            <dt>Warehouse location</dt>
            <dd>{part.warehouseLocation}</dd>
            <dt>Lifecycle status</dt>
            <dd>{part.lifecycleStatus}</dd>
            <dt>Last updated</dt>
            <dd>{new Date(part.updatedAt).toLocaleString()}</dd>
          </dl>
        </div>

        <div>
          <h3>Supplier</h3>
          <dl>
            <dt>Name</dt>
            <dd>{part.supplier.name}</dd>
            <dt>Country</dt>
            <dd>{part.supplier.country}</dd>
            <dt>Quality rating</dt>
            <dd>{part.supplier.qualityRating.toFixed(1)} / 5</dd>
            <dt>Contact email</dt>
            <dd>{part.supplier.contactEmail}</dd>
            <dt>Contact phone</dt>
            <dd>{part.supplier.contactPhone}</dd>
          </dl>
          <p className="muted">Contact details are partially masked for data protection.</p>
        </div>
      </div>

      <h3>Purchase orders and delivery dates</h3>
      {part.purchaseOrders.length === 0 ? (
        <p className="muted">No purchase orders are recorded for this part.</p>
      ) : (
        <div className="table-scroll">
          <table>
            <caption className="visually-hidden">Purchase orders for {part.partNumber}</caption>
            <thead>
              <tr>
                <th scope="col">PO number</th>
                <th scope="col">Quantity</th>
                <th scope="col">Status</th>
                <th scope="col">Ordered</th>
                <th scope="col">Expected delivery</th>
                <th scope="col">Unit price</th>
              </tr>
            </thead>
            <tbody>
              {part.purchaseOrders.map((po) => (
                <tr key={po.poNumber}>
                  <td data-label="PO number">{po.poNumber}</td>
                  <td data-label="Quantity">{po.quantity}</td>
                  <td data-label="Status">{po.status}</td>
                  <td data-label="Ordered">{po.orderDate}</td>
                  <td data-label="Expected delivery">{po.expectedDeliveryDate}</td>
                  <td data-label="Unit price">{po.unitPriceUsd}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="muted">
        Commercial data (unit cost: {part.sensitiveFields.unitCostUsd}, internal notes:{' '}
        {part.sensitiveFields.internalNotes}) is not available in this trial application.
      </p>
    </section>
  );
}
