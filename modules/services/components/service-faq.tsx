export function ServiceFaq({ faqs }: { faqs: Array<{ question: string; answer: string }> }) {
  return (
    <div className="space-y-3">
      {faqs.map((faq, index) => (
        <details
          key={`${faq.question}-${index}`}
          className="group rounded-md border border-border bg-card"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-foreground">
            {faq.question}
            <span aria-hidden="true" className="text-muted-foreground transition-transform group-open:rotate-45">
              +
            </span>
          </summary>
          <p className="px-4 pb-4 text-sm text-muted-foreground">{faq.answer}</p>
        </details>
      ))}
    </div>
  );
}
