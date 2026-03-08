import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { Resend } from 'npm:resend'

const resend = new Resend(Deno.env.get('re_MzMJn8mF_9VbVm1ru67LpLRupZPXt6A6E'));

serve(async (req) => {
  try {
    const { record, old_record, type } = await req.json();
    
    const customerEmail = record.customer_email; 
    const adminEmail = "mohommediflaan@gmail.com"; 
    const orderId = record.id.slice(0, 8).toUpperCase();
    const status = record.status;
    const items = record.items || [];

    const finalToAddress = customerEmail && customerEmail.includes('@') 
      ? customerEmail 
      : adminEmail; 

    // --- DYNAMIC STATUS MESSAGES ---
    let statusMessage = "We'll prepare your package for immediate dispatch and you will receive it shortly.";
    let emailSubject = `We have received your order #${orderId}`;

    switch(status) {
      case 'pending':
        statusMessage = "Your Order was placed and you will Receive an update for your order.";
        emailSubject = `Order Placed: #${orderId}`;
        break;
      case 'order confirmed':
        statusMessage = "Your Order was Confirm we will ship your parcel soon.";
        emailSubject = `Order Confirmed: #${orderId}`;
        break;
      case 'order shipped':
        statusMessage = "Your Order on its way You will receive it shortly.";
        emailSubject = `Order Shipped: #${orderId}`;
        break;
      case 'delivered':
        statusMessage = "Your order Delivered, Thanks for you Order.";
        emailSubject = `Order Delivered: #${orderId}`;
        break;
      case 'cancelled':
        statusMessage = "ohh sorry your order was canceled.";
        emailSubject = `Order Cancelled: #${orderId}`;
        break;
      case 'return requested':
        statusMessage = "We received your return request, and we'll contact you soon.";
        emailSubject = `Return Request Received: #${orderId}`;
        break;
      case 'return accepted':
        statusMessage = "Your return request was approved we will contact you for your guild.";
        emailSubject = `Return Request Approved: #${orderId}`;
        break;
      case 'return rejected':
        statusMessage = "ohh sorry Your return Request was Rejected. Please contact us for more info.";
        emailSubject = `Return Request Update: #${orderId}`;
        break;
    }

    // --- PROFESSIONAL HTML TEMPLATE ---
    const brandColor = "#000000";
    const lightGray = "#f4f4f4";

    const emailHtml = `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: auto; color: #333;">
      <div style="text-align: center; padding: 20px 0;">
        <h1 style="text-transform: uppercase; letter-spacing: 2px; margin: 0;">CloudSlee</h1>
      </div>
      
      <div style="padding: 20px; border: 1px solid ${lightGray}; border-radius: 8px;">
        <h2 style="font-weight: 500; margin-top: 0;">${status.toUpperCase()}</h2>
        <p style="color: #666; font-size: 14px; line-height: 1.5;">${statusMessage}</p>
        
        <div style="margin: 25px 0; font-size: 14px;">
          <strong>Order Number:</strong> ${orderId}<br />
          <strong>Order Date:</strong> ${new Date(record.created_at).toLocaleDateString()}
        </div>

        <h3 style="font-size: 12px; text-transform: uppercase; border-bottom: 2px solid ${brandColor}; padding-bottom: 5px;">Order Summary</h3>
        <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
          <tbody>
            ${items.map((item: any) => `
              <tr style="border-bottom: 1px solid ${lightGray};">
                <td style="padding: 10px 0;">
                  <div style="font-weight: bold;">${item.name || 'Product'}</div>
                  <div style="font-size: 12px; color: #777;">Quantity: ${item.quantity}</div>
                </td>
                <td style="text-align: right; padding: 10px 0;">
                  Rs. ${(item.price * item.quantity).toLocaleString()}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="background: ${lightGray}; padding: 15px; border-radius: 4px;">
          <table style="width: 100%; font-size: 14px;">
            <tr style="font-size: 18px; font-weight: bold;">
              <td style="padding: 5px 0;">Total Amount</td>
              <td style="text-align: right;">Rs. ${record.total_amount.toLocaleString()}</td>
            </tr>
          </table>
        </div>

        <div style="margin-top: 25px;">
          <h3 style="font-size: 12px; text-transform: uppercase; color: #888;">Shipping Info</h3>
          <p style="font-size: 13px; line-height: 1.5;">
            <strong>${record.customer_name}</strong><br />
            ${record.shipping_address}<br />
            Phone: ${record.phone}
          </p>
        </div>
      </div>

      <div style="text-align: center; padding: 20px; font-size: 11px; color: #999;">
        <p>This is an automatically generated email, please do not reply.</p>
        <p>&copy; ${new Date().getFullYear()} CloudSlee. All Rights Reserved.</p>
      </div>
    </div>
    `;

    // 1. Notify Admin on New Order or Return Request
    if (type === 'INSERT' || status.includes('return')) {
      await resend.emails.send({
        from: 'Store <onboarding@resend.dev>',
        to: adminEmail,
        subject: `ACTION REQUIRED: ${status.toUpperCase()} (#${orderId})`,
        html: `<p>New status update: <b>${status}</b> for Order #${orderId}</p>`
      });
    }

    // 2. Notify Customer with the Dynamic Template
    if (type === 'INSERT' || status !== old_record?.status) {
      await resend.emails.send({
        from: 'Store <onboarding@resend.dev>',
        to: finalToAddress,
        subject: emailSubject,
        html: emailHtml
      });
    }
    
    return new Response(JSON.stringify({ success: true }), { 
      headers: { "Content-Type": "application/json" },
      status: 200 
    });
  } catch (err) {
    console.error("Error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
})