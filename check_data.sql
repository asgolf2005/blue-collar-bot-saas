-- Check how many jobs have invoices
SELECT 
  COUNT(DISTINCT j.id) as total_jobs,
  COUNT(DISTINCT i.id) as jobs_with_invoices,
  COUNT(DISTINCT js.id) as total_job_services
FROM jobs j
LEFT JOIN invoices i ON i.job_id = j.id
LEFT JOIN job_services js ON js.job_id = j.id;

-- Check sample data
SELECT 
  j.id as job_id,
  j.description,
  i.total as invoice_total,
  s.name as service_name,
  s.base_price
FROM jobs j
LEFT JOIN invoices i ON i.job_id = j.id
LEFT JOIN job_services js ON js.job_id = j.id
LEFT JOIN services s ON s.id = js.service_id
LIMIT 10;
