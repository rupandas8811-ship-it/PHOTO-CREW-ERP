with open('/app/applet/src/components/SalesModule.tsx', 'a') as f:
    f.write("""                onClick={() => setFilterStatus(filterStatus === card.filterValue ? '' : card.filterValue)}
              />
            ))}
          </div>
        </div>
        )}
      </main>
    </div>
  );
};
""")
