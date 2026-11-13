import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@angkorgit/design-system';
import { getLocale, setLocale, type Locale } from '../../../../../packages/core/src/zhtw-i18n';
import { SettingCard } from './SettingCard';

export function ZhtwLanguageCard() {
  return (
    <SettingCard
      settingId="language"
      title="Language"
      description="Switching the language reloads the window."
      action={
        <Select value={getLocale()} onValueChange={(value) => setLocale(value as Locale)}>
          <SelectTrigger className="h-8 w-36" aria-label="Language">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="zh-TW">繁體中文</SelectItem>
            <SelectItem value="en">English</SelectItem>
          </SelectContent>
        </Select>
      }
    />
  );
}
