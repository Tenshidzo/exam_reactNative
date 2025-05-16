import NetInfo from '@react-native-community/netinfo';
import axios from 'axios';
import { getUnsyncedViolations, markAsSynced } from './violationStorage';

export const syncViolations = async (token, apiUrl) => {
  const netInfo = await NetInfo.fetch();
  if (!netInfo.isConnected) {
    console.log('[syncViolations] 🚫 No internet');
    return;
  }

  const violations = await getUnsyncedViolations();
  console.log(`[syncViolations] ⏳ Syncing ${violations.length} item(s)`);

  for (const violation of violations) {
    const formData = new FormData();
    formData.append('description', violation.description);
    formData.append('latitude', violation.latitude);
    formData.append('longitude', violation.longitude);
    formData.append('image', {
      uri: violation.imageUri,
      name: 'photo.jpg',
      type: 'image/jpeg',
    });

    try {
      const res = await axios.post(`${apiUrl}/violations`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      if (res.status === 200) {
        await markAsSynced(violation.id);
      }
    } catch (err) {
      console.error('[syncViolations] ❌ Error syncing violation:', err.message);
    }
  }
};
