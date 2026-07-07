function stripClientOnlyFields(table, record) {
    if (!record || typeof record !== 'object') return record;
    let cloned = { ...record };
    delete cloned.customer_id;
    const allowedColumns = {
      payments: [
        'payment_id', 'order_id', 'quotation_amount', 'advance_received', 'balance_due', 
        'final_payment_received', 'payment_date', 'payment_proof_url', 'payment_status', 'transaction_id'
      ]
    };
    if (table in allowedColumns) {
      const allowed = allowedColumns[table];
      for (const key of Object.keys(cloned)) {
        if (!allowed.includes(key)) {
          delete cloned[key];
        }
      }
    }
    return cloned;
}

const p = {
        payment_id: "PAY-123",
        order_id: "ORD-123",
        quotation_amount: 100,
        advance_received: 10,
        balance_due: 90,
        final_payment_received: 0,
        payment_proof_url: null,
        payment_status: 'Pending',
        transaction_id: null,
        payment_date: "2023-01-01",
};

console.log(stripClientOnlyFields('payments', p));
