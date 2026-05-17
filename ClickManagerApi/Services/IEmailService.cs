using ClickManagerApi.Models;

namespace ClickManagerApi.Services;

public interface IEmailService
{
    Task SendContactEmailsAsync(ContactRequest request);
}
