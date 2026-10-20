import { useRef } from 'react'
import { useReactToPrint } from 'react-to-print'
import { Printer, X } from 'lucide-react'

function Receipt({ sale, onClose }) {
  const receiptRef = useRef()

  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
  })

  if (!sale) return null

  const isSplit = sale.payment_method === 'split'
  const isCredit = sale.payment_method === 'credit'
  const creditPortion = isSplit ? Number(sale.total_amount) - Number(sale.amount_paid) : (isCredit ? Number(sale.total_amount) : 0)

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">

        {/* Actions — hidden on print */}
        <div className="print:hidden flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-800">Receipt</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-3 py-2 rounded-xl transition"
            >
              <Printer size={16} />
              Print
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Receipt Content — this is what actually prints */}
        <div ref={receiptRef} className="receipt-paper p-5 font-mono text-black">

          {/* Shop Header */}
          <div className="text-center mb-3">
            <h1 className="text-base font-bold tracking-wide">SADEEQ AGROVET</h1>
            <p className="text-[10px] text-gray-600">Agricultural Veterinary & General Merchant</p>
            <p className="text-[10px] text-gray-500 mt-1">
              {new Date(sale.created_at).toLocaleString('en-NG', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </p>
          </div>

          <div className="border-t border-dashed border-black" />

          {/* Sale Info */}
          <div className="text-[11px] py-2 space-y-0.5">
            <div className="flex justify-between">
              <span>Receipt No:</span>
              <span className="font-bold">{sale.id?.slice(0, 8).toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span>Branch:</span>
              <span>{sale.branches?.name || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span>Cashier:</span>
              <span>{sale.users?.name || 'N/A'}</span>
            </div>
            {sale.customers?.name && (
              <div className="flex justify-between">
                <span>Customer:</span>
                <span>{sale.customers.name}</span>
              </div>
            )}
          </div>

          <div className="border-t border-dashed border-black" />

          {/* Items */}
          <div className="text-[11px] py-2">
            {sale.sale_items?.map((item, index) => (
              <div key={index} className="mb-1.5">
                <div className="flex justify-between font-semibold">
                  <span>{item.products?.name}</span>
                  <span>₦{Number(item.subtotal).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>
                    {item.quantity} {item.products?.unit_of_measurement} × ₦{Number(item.unit_price).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-dashed border-black" />

          {/* Totals */}
          <div className="text-[11px] py-2 space-y-1">
            <div className="flex justify-between font-bold text-sm">
              <span>TOTAL</span>
              <span>₦{Number(sale.total_amount).toLocaleString()}</span>
            </div>

            <div className="flex justify-between">
              <span>Payment Method:</span>
              <span className="uppercase font-semibold">
                {isSplit ? sale.payment_method_now : sale.payment_method}
              </span>
            </div>

            {sale.payment_method === 'cash' && sale.change_given > 0 && (
              <div className="flex justify-between">
                <span>Change Given:</span>
                <span>₦{Number(sale.change_given).toLocaleString()}</span>
              </div>
            )}

            {(isSplit || isCredit) && (
              <>
                {isSplit && (
                  <div className="flex justify-between">
                    <span>Paid Now:</span>
                    <span>₦{Number(sale.amount_paid).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold border-t border-dashed border-black pt-1 mt-1">
                  <span>{isSplit ? 'Balance on Credit' : 'Charged to Credit'}</span>
                  <span>₦{creditPortion.toLocaleString()}</span>
                </div>
              </>
            )}
          </div>

          <div className="border-t border-dashed border-black" />

          {/* Footer */}
          <div className="text-center pt-3 text-[10px] text-gray-600 space-y-2">
            <p className="font-semibold text-gray-800">Thank you for your patronage!</p>
            <p>Goods sold in good condition are not returnable</p>
            <div className="border-t border-dashed border-black pt-2 mt-2">
              <p className="text-[9px] text-gray-400">Management System by</p>
              <p className="text-[10px] font-bold tracking-wide">SIFTECH</p>
              <p className="text-[9px] text-gray-400">0816 999 2202</p>
            </div>
          </div>

        </div>
      </div>

      {/* Print-specific styles: constrains the receipt to thermal paper width when actually printing */}
      <style>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }
          body * {
            visibility: hidden;
          }
          .receipt-paper, .receipt-paper * {
            visibility: visible;
          }
          .receipt-paper {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
          }
        }
      `}</style>
    </div>
  )
}

export default Receipt