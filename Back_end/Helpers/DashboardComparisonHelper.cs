namespace HotelManagementAPI.Helpers;

public static class DashboardComparisonHelper
{
    public static object Compare(decimal current, decimal previous, bool higherIsBetter)
    {
        var difference = current - previous;
        decimal? growthRate = previous == 0m ? (current == 0m ? null : 100m) : Math.Round((difference / previous) * 100m, 2);
        var trend = difference > 0m ? "up" : difference < 0m ? "down" : "stable";

        var directionMeaning = difference == 0m
            ? "neutral"
            : (higherIsBetter && difference > 0m) || (!higherIsBetter && difference < 0m)
                ? "positive"
                : "negative";

        return new
        {
            current,
            previous,
            difference,
            growthRate,
            trend,
            directionMeaning
        };
    }

    public static object Compare(int current, int previous, bool higherIsBetter)
        => Compare((decimal)current, previous, higherIsBetter);
}
