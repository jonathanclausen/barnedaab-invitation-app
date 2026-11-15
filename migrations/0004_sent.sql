-- Hvornår invitationen er sendt til gæsterne (NULL = ikke sendt endnu).
-- Tilføjer kun en kolonne, så eksisterende invitationer og svar bevares.
ALTER TABLE invites ADD COLUMN sent_at TEXT;
