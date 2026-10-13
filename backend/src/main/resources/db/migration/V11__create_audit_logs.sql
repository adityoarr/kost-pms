CREATE TABLE audit_logs (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_username VARCHAR(64),
    actor_role     VARCHAR(64),
    action         VARCHAR(48)  NOT NULL,
    entity_type    VARCHAR(32)  NOT NULL,
    entity_id      VARCHAR(64),                       -- null utk aksi CREATE (id tak ada di URL)
    http_method    VARCHAR(8)   NOT NULL,
    http_status    INT          NOT NULL,
    ip             VARCHAR(120),
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_created ON audit_logs (created_at DESC);
CREATE INDEX idx_audit_actor   ON audit_logs (actor_username);
CREATE INDEX idx_audit_action  ON audit_logs (action);
