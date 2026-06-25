import java.util.Locale;

public class TestLocale {
    public static void main(String[] args) {
        String[] countries = {"Austria", "Bahrain", "Saudi Arabia", "Australia", "Japan", "China", "United States", "Italy", "Monaco", "Canada", "Spain", "United Kingdom", "Hungary", "Belgium", "Netherlands", "Singapore", "Azerbaijan", "Qatar", "Mexico", "Brazil", "United Arab Emirates"};
        for (String c : countries) {
            String code = getCode(c);
            System.out.println(c + " -> " + code);
        }
    }
    
    public static String getCode(String countryName) {
        for (Locale locale : Locale.getAvailableLocales()) {
            if (countryName.equalsIgnoreCase(locale.getDisplayCountry(Locale.ENGLISH))) {
                return locale.getCountry().toLowerCase();
            }
        }
        return "UNKNOWN";
    }
}
