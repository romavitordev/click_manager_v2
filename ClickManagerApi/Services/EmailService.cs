using ClickManagerApi.Models;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;

namespace ClickManagerApi.Services;

public class EmailService : IEmailService
{
    private readonly EmailSettings _settings;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IOptions<EmailSettings> settings, ILogger<EmailService> logger)
    {
        _settings = settings.Value;
        _logger   = logger;
    }

    public async Task SendContactEmailsAsync(ContactRequest request)
    {
        await Task.WhenAll(
            SendConfirmationToUserAsync(request),
            SendNotificationToAdminAsync(request)
        );
    }

    private async Task SendConfirmationToUserAsync(ContactRequest request)
    {
        var planLabel = GetPlanLabel(request.Plan);
        var phone = string.IsNullOrEmpty(request.Phone)   ? "" : "<p><strong>WhatsApp:</strong> " + request.Phone + "</p>";
        var extra = string.IsNullOrEmpty(request.Message) ? "" : "<p><strong>Mensagem:</strong> " + request.Message + "</p>";

        var html =
            "<!DOCTYPE html><html><head><meta charset='UTF-8'/><style>" +
            "body{font-family:Arial,sans-serif;background:#f5f3fb;margin:0}" +
            ".w{max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden}" +
            ".h{background:#7c3aed;padding:32px 40px;text-align:center}" +
            ".h h1{color:#fff;margin:0}" +
            ".h p{color:#ddd6fe;margin:4px 0 0}" +
            ".b{padding:32px 40px;color:#1a1625}" +
            ".b h2{color:#7c3aed}" +
            ".box{background:#ede9f7;border-radius:10px;padding:16px 20px;margin:20px 0}" +
            ".box p{margin:4px 0}" +
            ".box strong{color:#5b21b6}" +
            ".f{background:#ede9f7;padding:16px 40px;text-align:center;font-size:.8rem;color:#6b6480}" +
            "</style></head><body><div class='w'>" +
            "<div class='h'><h1>Click Manager</h1><p>Gestao para fotografos</p></div>" +
            "<div class='b'><h2>Ola, " + request.Name + "!</h2>" +
            "<p>Recebemos sua solicitacao. Entraremos em contato em breve.</p>" +
            "<div class='box'>" +
            "<p><strong>Plano:</strong> " + planLabel + "</p>" +
            "<p><strong>E-mail:</strong> " + request.Email + "</p>" +
            phone + extra + "</div></div>" +
            "<div class='f'>2026 Click Manager - PIM III - UNIP ADS</div>" +
            "</div></body></html>";

        var m = new MimeMessage();
        m.From.Add(new MailboxAddress(_settings.SenderName, _settings.SenderEmail));
        m.To.Add(new MailboxAddress(request.Name, request.Email));
        m.Subject = "Recebemos sua solicitacao - Click Manager";
        m.Body    = new BodyBuilder { HtmlBody = html }.ToMessageBody();
        await SendAsync(m);
        _logger.LogInformation("Confirmacao enviada para {Email}", request.Email);
    }

    private async Task SendNotificationToAdminAsync(ContactRequest request)
    {
        var planLabel = GetPlanLabel(request.Plan);

        var html =
            "<!DOCTYPE html><html><head><meta charset='UTF-8'/><style>" +
            "body{font-family:Arial,sans-serif;background:#f5f3fb}" +
            ".c{max-width:500px;margin:30px auto;background:#fff;border-radius:12px;padding:28px}" +
            "h2{color:#7c3aed;margin-top:0}" +
            "table{width:100%;border-collapse:collapse}" +
            "td{padding:8px 12px;border-bottom:1px solid #ede9f7}" +
            "td:first-child{font-weight:600;color:#5b21b6;width:120px}" +
            "</style></head><body><div class='c'><h2>Novo lead</h2><table>" +
            "<tr><td>Nome</td><td>"     + request.Name                              + "</td></tr>" +
            "<tr><td>E-mail</td><td>"   + request.Email                             + "</td></tr>" +
            "<tr><td>WhatsApp</td><td>" + (request.Phone   ?? "-")                  + "</td></tr>" +
            "<tr><td>Plano</td><td>"    + planLabel                                 + "</td></tr>" +
            "<tr><td>Mensagem</td><td>" + (request.Message ?? "-")                  + "</td></tr>" +
            "<tr><td>Data</td><td>"     + DateTime.Now.ToString("dd/MM/yyyy HH:mm") + "</td></tr>" +
            "</table></div></body></html>";

        var m = new MimeMessage();
        m.From.Add(new MailboxAddress(_settings.SenderName, _settings.SenderEmail));
        m.To.Add(new MailboxAddress("Admin", _settings.AdminEmail));
        m.Subject = "Novo lead: " + request.Name + " - " + planLabel;
        m.Body    = new BodyBuilder { HtmlBody = html }.ToMessageBody();
        await SendAsync(m);
        _logger.LogInformation("Notificacao admin enviada.");
    }

    private async Task SendAsync(MimeMessage message)
    {
        using var client = new SmtpClient();
        await client.ConnectAsync(
            _settings.SmtpHost, _settings.SmtpPort,
            _settings.UseSsl ? SecureSocketOptions.SslOnConnect : SecureSocketOptions.StartTls);
        await client.AuthenticateAsync(_settings.SenderEmail, _settings.SenderPassword);
        await client.SendAsync(message);
        await client.DisconnectAsync(true);
    }

    private static string GetPlanLabel(string plan) => plan switch
    {
        "starter" => "Starter (Gratis)",
        "pro"     => "Pro (R$ 49/mes)",
        "studio"  => "Studio (R$ 99/mes)",
        _         => plan
    };
}
