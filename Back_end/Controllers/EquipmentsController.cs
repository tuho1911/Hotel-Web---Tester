using System.IO.Compression;
using System.Text;
using System.Xml.Linq;
using HotelManagementAPI.Data;
using HotelManagementAPI.DTOs;
using HotelManagementAPI.Enums;
using HotelManagementAPI.Models;
using HotelManagementAPI.Services;
using HotelManagementAPI.Helpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HotelManagementAPI.Controllers;

public record ReportDamageDto(
    int EquipmentId,
    int Quantity,
    decimal PenaltyAmount,
    string? Description,
    string? ImageUrl,
    int? BookingDetailId,
    int? RoomInventoryId
);

public record UpdateDamageStatusDto(string Status);

[ApiController]
[Route("api/[controller]")]
public class EquipmentsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly INotificationService _notificationService;
    private readonly ICloudinaryService _cloudinaryService;
    private readonly IInvoiceService _invoiceService;
    private readonly IAuditLogService _auditLogService;

    public EquipmentsController(
        AppDbContext context,
        INotificationService notificationService,
        ICloudinaryService cloudinaryService,
        IInvoiceService invoiceService,
        IAuditLogService auditLogService)
    {
        _context = context;
        _notificationService = notificationService;
        _cloudinaryService = cloudinaryService;
        _invoiceService = invoiceService;
        _auditLogService = auditLogService;
    }

    [HttpGet]
    [Authorize(Roles = "Admin,Manager,HR,Nhân sự,Staff,Housekeeping,WarehouseStaff")]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? search,
        [FromQuery] string? category,
        [FromQuery] bool includeInactive = false)
    {
        var query = _context.Equipments.AsQueryable();

        if (!includeInactive)
            query = query.Where(e => e.IsActive);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var q = search.Trim().ToLower();
            query = query.Where(e =>
                e.Name.ToLower().Contains(q) ||
                e.ItemCode.ToLower().Contains(q) ||
                (e.Supplier != null && e.Supplier.ToLower().Contains(q)));
        }

        if (!string.IsNullOrWhiteSpace(category))
            query = query.Where(e => e.Category == category);

        var result = await query
            .OrderBy(e => e.Id)
            .Select(e => new
            {
                e.Id,
                e.ItemCode,
                e.Name,
                e.Category,
                e.Unit,
                e.TotalQuantity,
                e.InUseQuantity,
                e.DamagedQuantity,
                e.LiquidatedQuantity,
                e.InStockQuantity,
                e.BasePrice,
                e.DefaultPriceIfLost,
                e.Supplier,
                e.ImageUrl,
                e.IsActive,
                e.CreatedAt
            })
            .ToListAsync();

        return Ok(result);
    }

    [HttpGet("{id}")]
    [Authorize(Roles = "Admin,Manager,HR,Nhân sự,Staff,Housekeeping,WarehouseStaff")]
    public async Task<IActionResult> GetById(int id)
    {
        var equipment = await _context.Equipments.FindAsync(id);
        if (equipment == null)
            return NotFound(new { message = "Vật tư không tồn tại" });

        return Ok(equipment);
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Manager,HR,Nhân sự")]
    public async Task<IActionResult> Create([FromBody] CreateEquipmentDto dto)
    {
        if (await _context.Equipments.AnyAsync(e => e.ItemCode == dto.ItemCode))
            return BadRequest(new { message = "Mã vật tư đã tồn tại" });

        var equipment = new Equipment
        {
            ItemCode = dto.ItemCode,
            Name = dto.Name,
            Category = dto.Category,
            Unit = dto.Unit,
            TotalQuantity = dto.TotalQuantity,
            InUseQuantity = 0,
            DamagedQuantity = 0,
            LiquidatedQuantity = 0,
            BasePrice = dto.BasePrice,
            DefaultPriceIfLost = dto.DefaultPriceIfLost,
            Supplier = dto.Supplier,
            ImageUrl = dto.ImageUrl,
            IsActive = true,
            CreatedAt = TimeHelper.Now,
            UpdatedAt = TimeHelper.Now
        };

        _context.Equipments.Add(equipment);
        await _context.SaveChangesAsync();
        await _auditLogService.LogAsync("CREATE", nameof(Equipment), new { equipment.Id, equipment.ItemCode }, null, dto, $"Tạo vật tư {equipment.Name}.");

        return CreatedAtAction(nameof(GetById), new { id = equipment.Id }, equipment);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,Manager,HR,Nhân sự")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateEquipmentDto dto)
    {
        var equipment = await _context.Equipments.FindAsync(id);
        if (equipment == null)
            return NotFound(new { message = "Vật tư không tồn tại" });

        equipment.Name = dto.Name;
        equipment.Category = dto.Category;
        equipment.Unit = dto.Unit;
        equipment.TotalQuantity = dto.TotalQuantity;
        equipment.BasePrice = dto.BasePrice;
        equipment.DefaultPriceIfLost = dto.DefaultPriceIfLost;
        equipment.Supplier = dto.Supplier;
        equipment.ImageUrl = dto.ImageUrl;
        equipment.IsActive = dto.IsActive;
        equipment.UpdatedAt = TimeHelper.Now;

        await _context.SaveChangesAsync();
        await _auditLogService.LogAsync("UPDATE", nameof(Equipment), new { equipment.Id, equipment.ItemCode }, dto, equipment, $"Cập nhật vật tư {equipment.Name}.");
        return Ok(equipment);
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin,HR,Nhân sự")]
    public async Task<IActionResult> Delete(int id)
    {
        var equipment = await _context.Equipments.FindAsync(id);
        if (equipment == null)
            return NotFound(new { message = "Vật tư không tồn tại" });

        equipment.IsActive = false;
        equipment.UpdatedAt = TimeHelper.Now;
        await _context.SaveChangesAsync();
        await _auditLogService.LogAsync("DELETE", nameof(Equipment), new { equipment.Id, equipment.ItemCode }, null, null, $"Vô hiệu hóa vật tư {equipment.Name}.");

        return Ok(new { message = "Đã xóa vật tư thành công" });
    }

    [HttpPost("{id}/restore")]
    [Authorize(Roles = "Admin,Manager,HR,Nhân sự")]
    public async Task<IActionResult> Restore(int id)
    {
        var equipment = await _context.Equipments.FindAsync(id);
        if (equipment == null)
            return NotFound(new { message = "Vật tư không tồn tại" });

        equipment.IsActive = true;
        equipment.UpdatedAt = TimeHelper.Now;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Đã khôi phục vật tư" });
    }

    [HttpPut("{id}/price")]
    [Authorize(Roles = "Admin,Manager,HR,Nhân sự")]
    public async Task<IActionResult> UpdatePrice(int id, [FromBody] UpdatePriceDto dto)
    {
        var equipment = await _context.Equipments.FindAsync(id);
        if (equipment == null)
            return NotFound(new { message = "Vật tư không tồn tại" });

        equipment.BasePrice = dto.BasePrice;
        equipment.DefaultPriceIfLost = dto.DefaultPriceIfLost;
        equipment.UpdatedAt = TimeHelper.Now;

        await _context.SaveChangesAsync();
        return Ok(new { message = "Đã cập nhật giá vật tư" });
    }

    [HttpPost("report-damage")]
    [Authorize(Roles = "Admin,Manager,Staff,Housekeeping")]
    public async Task<IActionResult> ReportDamage([FromBody] ReportDamageDto dto)
    {
        var equipment = await _context.Equipments.FindAsync(dto.EquipmentId);
        if (equipment == null)
            return NotFound(new { message = "Vật tư không tồn tại" });

        if (dto.Quantity <= 0)
            return BadRequest(new { message = "Số lượng hỏng phải lớn hơn 0" });

        var inStock = equipment.InStockQuantity;
        if (dto.Quantity > inStock + equipment.InUseQuantity)
            return BadRequest(new { message = "Số lượng ghi nhận vượt quá tổng vật tư hiện có" });

        var penalty = dto.PenaltyAmount > 0 ? dto.PenaltyAmount : equipment.DefaultPriceIfLost * dto.Quantity;
        var bookingDetailId = dto.BookingDetailId;

        if (!bookingDetailId.HasValue && dto.RoomInventoryId.HasValue)
        {
            var inventory = await _context.RoomInventories.FindAsync(dto.RoomInventoryId.Value);
            if (inventory != null && inventory.RoomId.HasValue)
            {
                var activeBookingDetail = await _context.BookingDetails
                    .Include(bd => bd.Booking)
                    .Where(bd => bd.RoomId == inventory.RoomId.Value && bd.Booking != null && bd.Booking.StatusString == "CheckedIn")
                    .OrderByDescending(bd => bd.CheckInDate)
                    .FirstOrDefaultAsync();

                if (activeBookingDetail != null)
                    bookingDetailId = activeBookingDetail.Id;
            }
        }

        var record = new LossAndDamage
        {
            EquipmentId = dto.EquipmentId,
            BookingDetailId = bookingDetailId,
            RoomInventoryId = dto.RoomInventoryId,
            Quantity = dto.Quantity,
            PenaltyAmount = penalty,
            Description = dto.Description,
            ImageUrl = dto.ImageUrl,
            Status = "pending",
            CreatedAt = TimeHelper.Now,
        };

        _context.LossAndDamages.Add(record);
        equipment.DamagedQuantity += dto.Quantity;
        equipment.UpdatedAt = TimeHelper.Now;

        await _context.SaveChangesAsync();

        if (bookingDetailId.HasValue)
        {
            var bookingDetail = await _context.BookingDetails.FindAsync(bookingDetailId.Value);
            if (bookingDetail != null && bookingDetail.BookingId.HasValue)
                await _invoiceService.RecalculateInvoiceAsync(bookingDetail.BookingId.Value);
        }

        if (dto.RoomInventoryId.HasValue)
        {
            var inventory = await _context.RoomInventories.FindAsync(dto.RoomInventoryId.Value);
            if (inventory != null)
                inventory.Quantity = Math.Max(0, (inventory.Quantity ?? 0) - dto.Quantity);

            await _context.SaveChangesAsync();
        }

        await NotifyDamageReportedAsync(equipment, record);
        return Ok(new { message = "Ghi nhận hỏng thành công", damageId = record.Id, penaltyAmount = penalty });
    }

    [HttpGet("damages")]
    [Authorize(Roles = "Admin,Manager,Staff,Housekeeping")]
    public async Task<IActionResult> GetDamages([FromQuery] string? status, [FromQuery] int? equipmentId)
    {
        var query = _context.LossAndDamages.Include(d => d.Equipment).AsQueryable();
        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(d => d.Status == status);
        if (equipmentId.HasValue)
            query = query.Where(d => d.EquipmentId == equipmentId.Value);

        var result = await query
            .OrderByDescending(d => d.CreatedAt)
            .Select(d => new
            {
                d.Id,
                d.EquipmentId,
                EquipmentName = d.Equipment != null ? d.Equipment.Name : null,
                d.Quantity,
                d.PenaltyAmount,
                d.Description,
                d.ImageUrl,
                d.Status,
                d.CreatedAt
            })
            .ToListAsync();

        return Ok(result);
    }

    [HttpPut("damage/{id}/status")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> UpdateDamageStatus(int id, [FromBody] UpdateDamageStatusDto dto)
    {
        var record = await _context.LossAndDamages.Include(d => d.Equipment).FirstOrDefaultAsync(d => d.Id == id);
        if (record == null)
            return NotFound(new { message = "Bản ghi không tồn tại" });
        if (record.Status != "pending")
            return BadRequest(new { message = "Chỉ có thể cập nhật trạng thái pending" });

        record.Status = dto.Status.ToLower();
        if (record.Status == "cancelled" && record.Equipment != null)
        {
            record.Equipment.DamagedQuantity = Math.Max(0, record.Equipment.DamagedQuantity - record.Quantity);
            if (record.RoomInventoryId.HasValue)
            {
                var inventory = await _context.RoomInventories.FindAsync(record.RoomInventoryId.Value);
                if (inventory != null)
                    inventory.Quantity = (inventory.Quantity ?? 0) + record.Quantity;
            }
        }

        await _context.SaveChangesAsync();

        if (record.BookingDetailId.HasValue)
        {
            var bookingDetail = await _context.BookingDetails.FindAsync(record.BookingDetailId.Value);
            if (bookingDetail != null && bookingDetail.BookingId.HasValue)
            {
                await _invoiceService.RecalculateInvoiceAsync(bookingDetail.BookingId.Value);
            }
        }

        await NotifyDamageStatusUpdatedAsync(record);
        return Ok(new { message = "Cập nhật trạng thái thành công", record.Status });
    }

    [HttpPost("import-excel")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> ImportExcel([FromForm] ImportEquipmentsExcelDto request)
    {
        var file = request.File;
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "File không hợp lệ" });

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        var rows = extension == ".csv"
            ? await ReadCsvRowsAsync(file)
            : await ReadExcelRowsAsync(file);

        if (rows == null || rows.Count <= 1)
            return BadRequest(new { message = "File trống hoặc không hợp lệ" });

        var created = 0;
        var updated = 0;

        // Đọc dòng tiêu đề (Header Row) và tìm vị trí tương ứng của các cột
        var headerRow = rows[0].Select(h => h.Trim().ToLower()).ToList();

        int itemCodeIdx = headerRow.FindIndex(h => h == "itemcode" || h == "mã vật tư");
        int nameIdx = headerRow.FindIndex(h => h == "name" || h == "tên vật tư");
        int categoryIdx = headerRow.FindIndex(h => h == "category" || h == "danh mục");
        int unitIdx = headerRow.FindIndex(h => h == "unit" || h == "đơn vị tính");
        int totalQtyIdx = headerRow.FindIndex(h => h == "totalquantity" || h == "tổng số lượng");
        int basePriceIdx = headerRow.FindIndex(h => h == "baseprice" || h == "giá gốc nhập" || h.Contains("giá gốc nhập") || h.Contains("baseprice"));
        int defaultPriceIfLostIdx = headerRow.FindIndex(h => h == "defaultpriceiflost" || h == "giá đền bù" || h.Contains("giá đền bù") || h.Contains("defaultpriceiflost"));
        int supplierIdx = headerRow.FindIndex(h => h == "supplier" || h == "nhà cung cấp");

        // Nếu tiêu đề không trùng khớp, fallback về vị trí mặc định của file mẫu
        if (itemCodeIdx == -1) itemCodeIdx = 0;
        if (nameIdx == -1) nameIdx = 1;
        if (categoryIdx == -1) categoryIdx = 2;
        if (unitIdx == -1) unitIdx = 3;
        if (totalQtyIdx == -1) totalQtyIdx = 4;
        if (basePriceIdx == -1) basePriceIdx = 5;
        if (defaultPriceIfLostIdx == -1) defaultPriceIfLostIdx = 6;
        if (supplierIdx == -1) supplierIdx = 7;

        for (var i = 1; i < rows.Count; i++)
        {
            var cells = rows[i];
            var itemCode = GetCell(cells, itemCodeIdx);
            if (string.IsNullOrWhiteSpace(itemCode))
                continue;

            var equipment = await _context.Equipments.FirstOrDefaultAsync(x => x.ItemCode == itemCode);
            var isNew = equipment == null;
            if (isNew)
                equipment = new Equipment { ItemCode = itemCode, CreatedAt = TimeHelper.Now };

            equipment!.Name = GetCell(cells, nameIdx);
            equipment.Category = GetCell(cells, categoryIdx);
            equipment.Unit = GetCell(cells, unitIdx);
            if (TryParseInt(GetCell(cells, totalQtyIdx), out var qty)) equipment.TotalQuantity = qty;
            if (TryParseDecimal(GetCell(cells, basePriceIdx), out var price)) equipment.BasePrice = price;
            if (TryParseDecimal(GetCell(cells, defaultPriceIfLostIdx), out var compensation)) equipment.DefaultPriceIfLost = compensation;
            equipment.Supplier = GetCell(cells, supplierIdx);
            equipment.IsActive = true;
            equipment.UpdatedAt = TimeHelper.Now;

            if (isNew)
                _context.Equipments.Add(equipment);

            created += isNew ? 1 : 0;
            updated += isNew ? 0 : 1;
        }

        await _context.SaveChangesAsync();
        return Ok(new { message = "Import thành công", created, updated });
    }

    [HttpGet("export")]
    [Authorize(Roles = "Admin,Manager,HR,Nhân sự,Staff,Housekeeping,WarehouseStaff")]
    public async Task<IActionResult> Export(
        [FromQuery] string? search,
        [FromQuery] string? category,
        [FromQuery] bool includeInactive = false)
    {
        var query = _context.Equipments.AsQueryable();

        if (!includeInactive)
            query = query.Where(e => e.IsActive);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var q = search.Trim().ToLower();
            query = query.Where(e =>
                e.Name.ToLower().Contains(q) ||
                e.ItemCode.ToLower().Contains(q) ||
                (e.Supplier != null && e.Supplier.ToLower().Contains(q)));
        }

        if (!string.IsNullOrWhiteSpace(category))
            query = query.Where(e => e.Category == category);

        var equipments = await query.OrderBy(e => e.Id).ToListAsync();

        var headers = new[] { "Mã vật tư", "Tên vật tư", "Danh mục", "Đơn vị tính", "Tổng số lượng", "Đang sử dụng", "Bị hỏng/mất", "Tồn kho", "Giá gốc nhập (VND)", "Giá đền bù (VND)", "Nhà cung cấp", "Trạng thái" };
        var rows = new List<string[]> { headers };

        foreach (var eq in equipments)
        {
            rows.Add(new[]
            {
                eq.ItemCode,
                eq.Name,
                eq.Category,
                eq.Unit,
                eq.TotalQuantity.ToString(),
                eq.InUseQuantity.ToString(),
                eq.DamagedQuantity.ToString(),
                eq.InStockQuantity.ToString(),
                eq.BasePrice.ToString("F0"),
                eq.DefaultPriceIfLost.ToString("F0"),
                eq.Supplier ?? string.Empty,
                eq.IsActive ? "Hoạt động" : "Đã ẩn"
            });
        }

        var bytes = CreateExcelTemplate(rows.ToArray());
        return File(
            bytes,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "danh-sach-vat-tu.xlsx");
    }

    [HttpGet("import-template")]
    [Authorize(Roles = "Admin,Manager,HR,Nhân sự,Staff,Housekeeping,WarehouseStaff")]
    public IActionResult DownloadImportTemplate()
    {
        var rows = new[]
        {
            new[] { "ItemCode", "Name", "Category", "Unit", "TotalQuantity", "BasePrice", "DefaultPriceIfLost", "Supplier" },
            new[] { "TB001", "Khăn tắm", "Textile", "Cái", "100", "120000", "300000", "Nha cung cap A" },
            new[] { "TB002", "May say toc", "Electrical", "Cái", "20", "450000", "675000", "Nha cung cap B" }
        };

        var bytes = CreateExcelTemplate(rows);
        return File(
            bytes,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "equipment-import-template.xlsx");
    }

    [HttpGet("stock-summary")]
    [Authorize(Roles = "Admin,Manager,HR,Staff,Housekeeping,WarehouseStaff")]
    public async Task<IActionResult> GetStockSummary()
    {
        var query = _context.Equipments
            .AsNoTracking()
            .Where(e => e.IsActive);

        var summary = await query
            .GroupBy(e => e.Category)
            .Select(g => new
            {
                category = string.IsNullOrWhiteSpace(g.Key) ? "Uncategorized" : g.Key,
                totalItems = g.Count(),
                totalQuantity = g.Sum(e => e.TotalQuantity),
                inUseQuantity = g.Sum(e => e.InUseQuantity),
                damagedQuantity = g.Sum(e => e.DamagedQuantity),
                inStockQuantity = g.Sum(e => e.TotalQuantity - e.InUseQuantity - e.DamagedQuantity - e.LiquidatedQuantity)
            })
            .OrderBy(x => x.category)
            .ToListAsync();

        var overall = await query
            .GroupBy(_ => 1)
            .Select(g => new
            {
                total = g.Count(),
                inUse = g.Sum(e => e.InUseQuantity),
                damaged = g.Sum(e => e.DamagedQuantity),
                inStock = g.Sum(e => e.TotalQuantity - e.InUseQuantity - e.DamagedQuantity - e.LiquidatedQuantity)
            })
            .FirstOrDefaultAsync();

        return Ok(new
        {
            overall = overall ?? new { total = 0, inUse = 0, damaged = 0, inStock = 0 },
            byCategory = summary
        });
    }

    [HttpPost("{id}/image")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> UploadImage(int id, IFormFile file)
    {
        var equipment = await _context.Equipments.FindAsync(id);
        if (equipment == null)
            return NotFound();

        var (url, _) = await _cloudinaryService.UploadImageAsync(file, $"Equipment/{id}");
        equipment.ImageUrl = url;
        await _context.SaveChangesAsync();
        return Ok(new { imageUrl = url });
    }

    private static async Task<List<List<string>>> ReadExcelRowsAsync(IFormFile file)
    {
        await using var stream = file.OpenReadStream();
        using var archive = new ZipArchive(stream, ZipArchiveMode.Read);
        var sharedStrings = ReadSharedStrings(archive);
        var sheetEntry = archive.GetEntry("xl/worksheets/sheet1.xml");
        if (sheetEntry == null)
            return new List<List<string>>();

        using var sheetStream = sheetEntry.Open();
        var document = XDocument.Load(sheetStream);
        XNamespace ns = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";

        return document.Descendants(ns + "row")
            .Select(row => row.Elements(ns + "c")
                .Select(c =>
                {
                    var value = c.Element(ns + "v")?.Value ?? string.Empty;
                    var type = c.Attribute("t")?.Value;
                    if (type == "s" && int.TryParse(value, out var idx) && idx >= 0 && idx < sharedStrings.Count)
                        return sharedStrings[idx];

                    return value;
                })
                .ToList())
            .ToList();
    }

    private static async Task<List<List<string>>> ReadCsvRowsAsync(IFormFile file)
    {
        using var reader = new StreamReader(file.OpenReadStream());
        var rows = new List<List<string>>();

        while (true)
        {
            var line = await reader.ReadLineAsync();
            if (line == null)
                break;

            rows.Add(line
                .Split(',')
                .Select(cell => cell.Trim().Trim('"'))
                .ToList());
        }

        return rows;
    }

    private static List<string> ReadSharedStrings(ZipArchive archive)
    {
        var entry = archive.GetEntry("xl/sharedStrings.xml");
        if (entry == null)
            return new List<string>();

        using var stream = entry.Open();
        var doc = XDocument.Load(stream);
        XNamespace ns = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
        return doc.Descendants(ns + "t").Select(t => t.Value).ToList();
    }

    private static byte[] CreateExcelTemplate(string[][] rows)
    {
        using var memoryStream = new MemoryStream();
        using (var archive = new ZipArchive(memoryStream, ZipArchiveMode.Create, leaveOpen: true))
        {
            AddZipEntry(archive, "[Content_Types].xml",
                """
                <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
                  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
                  <Default Extension="xml" ContentType="application/xml"/>
                  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
                  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
                  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
                  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
                  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
                </Types>
                """);

            AddZipEntry(archive, "_rels/.rels",
                """
                <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
                  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
                  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
                  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
                </Relationships>
                """);

            AddZipEntry(archive, "docProps/app.xml",
                """
                <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                <Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"
                            xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
                  <Application>HotelManagementAPI</Application>
                </Properties>
                """);

            AddZipEntry(archive, "docProps/core.xml",
                """
                <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                <cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
                                   xmlns:dc="http://purl.org/dc/elements/1.1/"
                                   xmlns:dcterms="http://purl.org/dc/terms/"
                                   xmlns:dcmitype="http://purl.org/dc/dcmitype/"
                                   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
                  <dc:creator>HotelManagementAPI</dc:creator>
                  <cp:lastModifiedBy>HotelManagementAPI</cp:lastModifiedBy>
                  <dcterms:created xsi:type="dcterms:W3CDTF">2026-04-23T00:00:00Z</dcterms:created>
                  <dcterms:modified xsi:type="dcterms:W3CDTF">2026-04-23T00:00:00Z</dcterms:modified>
                </cp:coreProperties>
                """);

            AddZipEntry(archive, "xl/_rels/workbook.xml.rels",
                """
                <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
                  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
                  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
                </Relationships>
                """);

            AddZipEntry(archive, "xl/workbook.xml",
                """
                <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                <workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
                          xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
                  <bookViews>
                    <workbookView xWindow="0" yWindow="0" windowWidth="24000" windowHeight="12000"/>
                  </bookViews>
                  <sheets>
                    <sheet name="Equipments" sheetId="1" r:id="rId1"/>
                  </sheets>
                </workbook>
                """);

            AddZipEntry(archive, "xl/styles.xml",
                """
                <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                <styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
                  <fonts count="1">
                    <font>
                      <sz val="11"/>
                      <color rgb="000000"/>
                      <name val="Calibri"/>
                      <family val="2"/>
                    </font>
                  </fonts>
                  <fills count="2">
                    <fill><patternFill patternType="none"/></fill>
                    <fill><patternFill patternType="gray125"/></fill>
                  </fills>
                  <borders count="1">
                    <border><left/><right/><top/><bottom/><diagonal/></border>
                  </borders>
                  <cellStyleXfs count="1">
                    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
                  </cellStyleXfs>
                  <cellXfs count="1">
                    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
                  </cellXfs>
                  <cellStyles count="1">
                    <cellStyle name="Normal" xfId="0" builtinId="0"/>
                  </cellStyles>
                </styleSheet>
                """);

            var sheetXml = new StringBuilder();
            var lastColumn = GetExcelColumnName(rows.Max(row => row.Length));
            sheetXml.Append("<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>");
            sheetXml.Append("<worksheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\">");
            sheetXml.Append($"<dimension ref=\"A1:{lastColumn}{rows.Length}\"/>");
            sheetXml.Append("<sheetViews><sheetView workbookViewId=\"0\"/></sheetViews>");
            sheetXml.Append("<sheetFormatPr defaultRowHeight=\"15\"/>");
            sheetXml.Append("<sheetData>");
            for (var rowIndex = 0; rowIndex < rows.Length; rowIndex++)
            {
                sheetXml.Append($"<row r=\"{rowIndex + 1}\">");
                for (var columnIndex = 0; columnIndex < rows[rowIndex].Length; columnIndex++)
                {
                    var cellRef = GetExcelColumnName(columnIndex + 1) + (rowIndex + 1);
                    var escapedValue = System.Security.SecurityElement.Escape(rows[rowIndex][columnIndex]) ?? string.Empty;
                    sheetXml.Append($"<c r=\"{cellRef}\" t=\"inlineStr\"><is><t>{escapedValue}</t></is></c>");
                }
                sheetXml.Append("</row>");
            }
            sheetXml.Append("</sheetData>");
            sheetXml.Append("<pageMargins left=\"0.7\" right=\"0.7\" top=\"0.75\" bottom=\"0.75\" header=\"0.3\" footer=\"0.3\"/>");
            sheetXml.Append("</worksheet>");
            AddZipEntry(archive, "xl/worksheets/sheet1.xml", sheetXml.ToString());
        }

        return memoryStream.ToArray();
    }

    private static void AddZipEntry(ZipArchive archive, string path, string content)
    {
        var entry = archive.CreateEntry(path, CompressionLevel.Fastest);
        using var writer = new StreamWriter(entry.Open(), new UTF8Encoding(false));
        writer.Write(content);
    }

    private static string GetExcelColumnName(int index)
    {
        var columnName = string.Empty;
        while (index > 0)
        {
            index--;
            columnName = (char)('A' + (index % 26)) + columnName;
            index /= 26;
        }

        return columnName;
    }

    private static bool TryParseInt(string value, out int result) => int.TryParse(value, out result);
    private static bool TryParseDecimal(string value, out decimal result) => decimal.TryParse(value, out result);
    private static string GetCell(List<string> cells, int index) => index < cells.Count ? cells[index] : string.Empty;

    private async Task NotifyDamageReportedAsync(Equipment equipment, LossAndDamage record)
    {
        try
        {
            var content = $"Vat tu {equipment.Name} vua duoc bao hong/mat, so luong {record.Quantity}, muc den bu {record.PenaltyAmount:N0} VND.";

            await _notificationService.SendToRoleByNameAsync(
                "Admin",
                "Bao hong vat tu moi",
                content,
                NotificationType.Warning,
                "/admin/inventory/damages");

            await _notificationService.SendToRoleByNameAsync(
                "Manager",
                "Bao hong vat tu moi",
                content,
                NotificationType.Warning,
                "/admin/inventory/damages");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Damage Report Notification Error]: {ex.Message}");
        }
    }

    private async Task NotifyDamageStatusUpdatedAsync(LossAndDamage record)
    {
        try
        {
            var content = $"Bao hong #{record.Id} da duoc cap nhat sang trang thai {record.Status}.";

            await _notificationService.SendToRoleByNameAsync(
                "Admin",
                "Cap nhat xu ly hu hong",
                content,
                record.Status == "confirmed" ? NotificationType.Info : NotificationType.Warning,
                "/admin/inventory/damages");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Damage Status Notification Error]: {ex.Message}");
        }
    }
}
