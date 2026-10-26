using System.Text;
using System.Text.RegularExpressions;
using HotelManagementAPI.Data;
using Microsoft.EntityFrameworkCore;

namespace HotelManagementAPI.Services;

public interface ISlugService
{
    Task<string> GenerateUniqueSlugAsync(string title, int? excludeArticleId = null);
}

public class SlugService : ISlugService
{
    private readonly AppDbContext _context;

    public SlugService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<string> GenerateUniqueSlugAsync(string title, int? excludeArticleId = null)
    {
        var baseSlug = ConvertToSlug(title);
        var slug = baseSlug;
        var counter = 1;

        // Kiểm tra trùng lặp trong DB
        while (await SlugExistsAsync(slug, excludeArticleId))
        {
            slug = $"{baseSlug}-{counter}";
            counter++;
        }

        return slug;
    }

    private async Task<bool> SlugExistsAsync(string slug, int? excludeId)
    {
        var query = _context.Articles.Where(a => a.Slug == slug);
        if (excludeId.HasValue)
            query = query.Where(a => a.Id != excludeId.Value);
        return await query.AnyAsync();
    }

    private static string ConvertToSlug(string title)
    {
        // Bước 1: Chuyển lowercase
        var slug = title.ToLower().Trim();

        // Bước 2: Xóa dấu tiếng Việt
        slug = RemoveVietnameseDiacritics(slug);

        // Bước 3: Thay khoảng trắng và ký tự đặc biệt bằng dấu gạch ngang
        slug = Regex.Replace(slug, @"[^a-z0-9\s-]", "");
        slug = Regex.Replace(slug, @"\s+", "-");
        slug = Regex.Replace(slug, @"-+", "-");
        slug = slug.Trim('-');

        return slug;
    }

    private static string RemoveVietnameseDiacritics(string text)
    {
        var map = new Dictionary<string, string>
        {
            {"à|á|ả|ã|ạ|ă|ắ|ặ|ằ|ẳ|ẵ|â|ấ|ầ|ẩ|ẫ|ậ", "a"},
            {"è|é|ẻ|ẽ|ẹ|ê|ế|ề|ể|ễ|ệ", "e"},
            {"ì|í|ỉ|ĩ|ị", "i"},
            {"ò|ó|ỏ|õ|ọ|ô|ố|ồ|ổ|ỗ|ộ|ơ|ớ|ờ|ở|ỡ|ợ", "o"},
            {"ù|ú|ủ|ũ|ụ|ư|ứ|ừ|ử|ữ|ự", "u"},
            {"ỳ|ý|ỷ|ỹ|ỵ", "y"},
            {"đ", "d"}
        };

        foreach (var pair in map)
        {
            foreach (var ch in pair.Key.Split('|'))
                text = text.Replace(ch, pair.Value);
        }

        return text;
    }
}
