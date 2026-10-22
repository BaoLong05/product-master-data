namespace ProductMasterData.Application.Imports;

public sealed class InvalidWorkbookException(string message) : Exception(message);
