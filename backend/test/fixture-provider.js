// TEST ONLY. Deterministic responses exercise infrastructure, not AI autonomy.
// Never imported by src/ or exposed as a runtime/demo provider.
export class FixtureProvider {
  name = 'TEST_FIXTURE_NOT_AI';
  model = 'deterministic-test-fixture';
  configured = true;
  invalidRemaining = 0;
  fail = false;
  calls = [];
  async generate(request) {
    this.calls.push(request);
    if (this.fail) throw new Error('Deliberate fixture agent failure');
    if (this.invalidRemaining-- > 0) return { invalid: true };
    const { data, name } = request;
    if (name === 'orchestrator_output') {
      const business = data.context.business;
      const selected = business.orders.filter(o => data.constraints.orderIds.includes(o.id));
      const outstanding = selected.reduce((s, o) => s + o.quantity - o.allocated, 0);
      const stock = business.inventory.find(i => i.sku === data.constraints.sku).available;
      const purchases = business.purchases.filter(p => p.taskId && selected.some(o => o.sku === p.sku));
      const supply = purchases.reduce((s, p) => s + p.quantity - p.allocated, 0);
      const steps = [
        { id: 'research', agent: 'research', objective: 'TEST FIXTURE: inspect_business' },
        { id: 'analysis', agent: 'analysis', objective: 'TEST FIXTURE: compare_supply' },
      ];
      if (Math.min(stock, outstanding) > 0) steps.push({ id: 'reserve', agent: 'execution', objective: 'TEST FIXTURE: reserve_inventory' });
      if (outstanding - stock - supply > 0) steps.push({ id: 'purchase', agent: 'execution', objective: 'TEST FIXTURE: place_purchase' });
      if (outstanding - stock > 0) steps.push({ id: 'allocate', agent: 'execution', objective: 'TEST FIXTURE: allocate_purchase' });
      steps.push({ id: 'verify', agent: 'verification', objective: 'TEST FIXTURE: verify_fulfillment' },
        { id: 'report', agent: 'communication', objective: 'TEST FIXTURE: publish_report' });
      return { summary: 'TEST FIXTURE generated from current test records; not an autonomous AI claim', steps };
    }
    if (name === 'verification_output' && data.evidence) return { passed: data.evidence.passed,
      explanation: 'TEST FIXTURE verdict on deterministic evidence', discrepancies: data.evidence.discrepancies };
    const tool = data.step.objective.split(': ')[1];
    const args = { sku: null, quantity: null, supplierId: null, expectedVersion: null, orderIds: null, purchaseId: null, message: null };
    const business = data.context.business;
    const orders = business.orders.filter(o => data.constraints.orderIds.includes(o.id));
    const outstanding = orders.reduce((s, o) => s + o.quantity - o.allocated, 0);
    const inventory = business.inventory.find(i => i.sku === data.constraints.sku);
    if (['inspect_business', 'compare_supply', 'reserve_inventory', 'place_purchase'].includes(tool)) args.sku = data.constraints.sku;
    if (tool === 'compare_supply') args.quantity = Math.max(1, outstanding - inventory.available);
    if (tool === 'reserve_inventory') { args.quantity = Math.min(outstanding, inventory.available); args.orderIds = data.constraints.orderIds; }
    if (tool === 'place_purchase') {
      const selected = business.suppliers.filter(s => s.available >= outstanding && s.leadDays <= data.constraints.deadlineDays)
        .sort((a, b) => a.unitCost - b.unitCost)[0] || business.suppliers[0];
      args.quantity = outstanding; args.supplierId = selected.id; args.expectedVersion = selected.version;
    }
    if (tool === 'allocate_purchase') {
      const purchase = business.purchases.find(p => p.quantity > p.allocated);
      args.purchaseId = purchase?.id || 'MISSING'; args.quantity = purchase?.quantity || 1; args.orderIds = data.constraints.orderIds;
    }
    if (tool === 'publish_report') args.message = 'TEST FIXTURE report: order supply allocations verified against persisted MongoDB records. Incoming units are scheduled, not delivered.';
    return { tool, arguments: args, rationale: `TEST FIXTURE chooses ${tool}`, memoryUsed: data.context.memory.map(m => String(m._id)) };
  }
}
